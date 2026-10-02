import { logger } from "../observability/logger"
import { traceSync } from "../observability/trace"

export type CustomerOrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled"

type NativeOrder = { status?: unknown; payment_status?: unknown; fulfillment_status?: unknown; payments?: { status?: unknown }[]; payment_collection?: { status?: unknown }; fulfillments?: { status?: unknown }[] }

const transitions: Record<CustomerOrderStatus, readonly CustomerOrderStatus[]> = {
  pending: ["pending", "paid", "shipped", "delivered", "cancelled"],
  paid: ["paid", "shipped", "delivered", "cancelled"],
  shipped: ["shipped", "delivered", "cancelled"],
  delivered: ["delivered"],
  cancelled: ["cancelled"],
}

function native(value: unknown): string { return traceSync("orders.status.native", () => typeof value === "string" ? value.trim().toLowerCase() : "") }

export function mapNativeOrderStatus(order: NativeOrder): CustomerOrderStatus {
  return traceSync("orders.status.map", () => {
    const orderStatus = native(order.status)
    const paymentStatus = native(order.payment_status ?? order.payment_collection?.status ?? order.payments?.[0]?.status)
    const fulfillmentStatus = native(order.fulfillment_status ?? order.fulfillments?.[0]?.status)
    if (["cancelled", "canceled", "cancelled_at"].includes(orderStatus) || ["cancelled", "canceled"].includes(paymentStatus)) return "cancelled"
    if (["delivered"].includes(fulfillmentStatus)) return "delivered"
    if (["shipped", "fulfilled", "partially_fulfilled"].includes(fulfillmentStatus)) return "shipped"
    if (["paid", "partially_paid", "authorized"].includes(paymentStatus) || ["completed", "paid"].includes(orderStatus)) return "paid"
    if (orderStatus || paymentStatus || fulfillmentStatus) return "pending"
    logger.warn({ event: "orders.status.unknown", operation: "mapNativeOrderStatus" }, "unknown native order state projected safely")
    return "pending"
  })
}

export function projectCustomerOrderStatus(previous: CustomerOrderStatus | undefined, next: CustomerOrderStatus): CustomerOrderStatus {
  return traceSync("orders.status.project", () => previous && !transitions[previous].includes(next) ? previous : next)
}
