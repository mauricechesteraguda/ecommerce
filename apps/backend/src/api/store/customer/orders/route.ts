import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getOrdersListWorkflow } from "@medusajs/core-flows"
import { randomUUID } from "node:crypto"
import { logger } from "../../../../observability/logger"
import { trace, traceSync } from "../../../../observability/trace"
import { mapNativeOrderStatus } from "../../../../orders/status"

type NativeOrder = Record<string, any>

function correlation(req: MedusaRequest): string { return traceSync("orders.correlation", () => String(req.headers["x-correlation-id"] ?? randomUUID())) }

function customerId(req: MedusaRequest): string | undefined {
  return traceSync("orders.customerId", () => ((req as MedusaRequest & { auth_context?: { actor_id?: string } }).auth_context)?.actor_id)
}

function snapshot(order: NativeOrder): Record<string, unknown> {
  return traceSync("orders.snapshot", () => ({
    id: order.id,
    display_id: order.display_id,
    created_at: order.created_at,
    currency_code: order.currency_code,
    total: order.total,
    status: mapNativeOrderStatus(order),
    items: (order.items ?? order.line_items ?? []).map((item: NativeOrder) => ({ id: item.id, title: item.title, variant_title: item.variant_title, quantity: item.quantity, unit_price: item.unit_price, total: item.total, thumbnail: item.thumbnail })),
    shipping_address: order.shipping_address ? { city: order.shipping_address.city, country_code: order.shipping_address.country_code, postal_code: order.shipping_address.postal_code } : undefined,
  }))
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  // feature-10022026-Maurice: use the native order workflow so customer views
  // receive the same payment and fulfillment relations as admin views.
  const correlationId = correlation(req)
  res.setHeader("x-correlation-id", correlationId)
  logger.info({ event: "orders.api.entry", operation: "customer_history", correlation_id: correlationId }, "customer order history request")
  await trace("orders.api.GET", async () => {
    const actorId = customerId(req)
    if (!actorId) {
      logger.info({ event: "orders.api.unauthenticated", operation: "customer_history", correlation_id: correlationId }, "customer order history denied")
      res.status(401).json({ type: "session_expired", message: "Sign in to view your orders.", correlation_id: correlationId })
      return
    }
    const limit = Math.min(Math.max(Number(req.query.limit ?? 10) || 10, 1), 50)
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0)
    const orderId = typeof req.query.order_id === "string" && /^[A-Za-z0-9_-]+$/.test(req.query.order_id) ? req.query.order_id : undefined
    logger.info({ event: "external.medusa.query", operation: "list_customer_orders", correlation_id: correlationId, limit, offset }, "querying native Medusa orders")
    const workflow = getOrdersListWorkflow(req.scope)
    const fields = ["id", "status", "total", "currency_code", "created_at", "summary", "*items", "*items.detail", "*shipping_address", "*fulfillments", "*payment_collections", "*payment_collections.payments"]
    const result = await trace("orders.api.medusa.listOrders", () => workflow.run({ input: { fields, variables: { filters: { customer_id: actorId, ...(orderId ? { id: orderId } : {}) }, take: 1000 } } }))
    const workflowResult = result.result as any
    const orders = (Array.isArray(workflowResult) ? workflowResult : workflowResult.rows) as NativeOrder[]
    const page = orders.slice(offset, offset + limit).map(snapshot)
    res.json({ orders: page, count: orders.length, offset, limit })
    logger.info({ event: "orders.api.exit", operation: "customer_history", correlation_id: correlationId, count: orders.length, returned: page.length }, "customer order history response")
  }).catch((error) => {
    logger.error({ event: "orders.api.error", operation: "customer_history", correlation_id: correlationId, error }, "customer order history failed")
    if (!res.headersSent) res.status(503).json({ type: "temporarily_unavailable", message: "Orders are temporarily unavailable.", correlation_id: correlationId })
  })
}
