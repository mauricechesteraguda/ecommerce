// feature-10022026-Maurice: signed raw-body Stripe webhook boundary; redirect responses never mutate order state.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { completeCartWorkflowId } from "@medusajs/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { trace } from "../../../../observability/trace"
import { logger } from "../../../../observability/logger"
import { claimEmail, claimPaymentEvent, markPaymentEvent, sendOrderPaidEmail, verifyWebhookSignature } from "../../../../checkout/service"

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await trace("payment.webhook.POST", async () => {
    const correlationId = String(req.headers["x-correlation-id"] ?? crypto.randomUUID()); res.setHeader("x-correlation-id", correlationId)
    let eventId: string | undefined
    try {
      const raw = req.rawBody ? Buffer.from(req.rawBody) : Buffer.from(JSON.stringify(req.body ?? {})); verifyWebhookSignature(raw, req.headers["stripe-signature"])
      const event = JSON.parse(raw.toString("utf8")) as { id?: string; type?: string; data?: { object?: { id?: string; metadata?: { cart_id?: string }; customer_email?: string; receipt_email?: string } } }
      eventId = event.id
      if (!event.id || event.type !== "payment_intent.succeeded" || !event.data?.object?.id) { res.status(200).json({ received: true, ignored: true }); return }
      const intent = event.data.object; const intentId = String(intent.id); const cartId = intent.metadata?.cart_id; if (!await claimPaymentEvent(event.id, intentId, cartId)) { res.status(200).json({ received: true, duplicate: true }); return }
      if (!cartId) throw new Error("Payment intent is missing cart metadata")
      const workflow = req.scope.resolve(Modules.WORKFLOW_ENGINE) as any; const completion = await workflow.run(completeCartWorkflowId, { input: { id: cartId }, throwOnError: false })
      if (completion.errors?.length || !completion.result?.id) throw new Error(`Native Medusa cart completion failed: ${completion.errors?.[0]?.error?.message ?? "unknown"}`)
      await markPaymentEvent(event.id, "processed")
      if (await claimEmail(String(completion.result.id))) void sendOrderPaidEmail(String(completion.result.id), intent.receipt_email ?? intent.customer_email ?? "customer@example.invalid").catch((error) => logger.error({ event: "external.email.failure", correlation_id: correlationId, order_id: String(completion.result.id), error }, "order email isolated failure"))
      logger.info({ event: "payment.webhook.processed", correlation_id: correlationId, event_id: event.id, order_id: completion.result.id }, "verified payment processed")
      res.status(200).json({ received: true, order_id: completion.result.id })
    } catch (error) { if (eventId) await markPaymentEvent(eventId, "failed"); logger.warn({ event: "payment.webhook.rejected", correlation_id: correlationId, error_message: error instanceof Error ? error.message : "unknown", error }, "webhook rejected"); res.status(400).json({ type: "invalid_webhook", message: "Webhook could not be verified or processed.", correlation_id: correlationId }) }
  })
}
