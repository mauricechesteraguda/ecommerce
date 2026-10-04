// feature-10022026-Maurice: signed raw-body Stripe webhook boundary; redirect responses never mutate order state.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { capturePaymentWorkflow, completeCartWorkflowId, getOrderDetailWorkflow, markPaymentCollectionAsPaid } from "@medusajs/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { trace } from "../../../../observability/trace"
import { logger, safeError } from "../../../../observability/logger"
import { claimEmail, claimPaymentEvent, markPaymentEvent, sendOrderPaidEmail, verifyWebhookSignature } from "../../../../checkout/service"
import { recordStripeWebhook } from "../../../../observability/metrics"

// modification-10042026-Maurice: webhook outcomes record bounded status classes only.
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await trace("payment.webhook.POST", async () => {
    const correlationId = String(req.headers["x-correlation-id"] ?? crypto.randomUUID()); res.setHeader("x-correlation-id", correlationId)
    let eventId: string | undefined
    try {
      const raw = req.rawBody ? Buffer.from(req.rawBody) : Buffer.from(JSON.stringify(req.body ?? {})); verifyWebhookSignature(raw, req.headers["stripe-signature"])
      const event = JSON.parse(raw.toString("utf8")) as { id?: string; type?: string; data?: { object?: { id?: string; metadata?: { cart_id?: string }; customer_email?: string; receipt_email?: string } } }
      eventId = event.id
      if (!event.id || event.type !== "payment_intent.succeeded" || !event.data?.object?.id) { recordStripeWebhook("ignored"); res.status(200).json({ received: true, ignored: true }); return }
      const intent = event.data.object; const intentId = String(intent.id); const cartId = intent.metadata?.cart_id; if (!await claimPaymentEvent(event.id, intentId, cartId)) { recordStripeWebhook("duplicate"); res.status(200).json({ received: true, duplicate: true }); return }
      if (!cartId) throw new Error("Payment intent is missing cart metadata")
      const workflow = req.scope.resolve(Modules.WORKFLOW_ENGINE) as any; const completion = await workflow.run(completeCartWorkflowId, { input: { id: cartId }, throwOnError: false })
      if (completion.errors?.length || !completion.result?.id) throw new Error(`Native Medusa cart completion failed: ${completion.errors?.[0]?.error?.message ?? "unknown"}`)
      const orderDetails = await getOrderDetailWorkflow(req.scope).run({ input: { order_id: String(completion.result.id), fields: ["id", "payment_collections.id", "payment_collections.status", "payment_collections.amount", "payment_collections.payments.id"] } })
      const paymentCollection = (orderDetails.result as any)?.payment_collections?.[0]
      if (!paymentCollection?.id) throw new Error("Native Medusa order has no payment collection")
      if (paymentCollection.status === "not_paid") {
        await markPaymentCollectionAsPaid(req.scope).run({ input: { order_id: String(completion.result.id), payment_collection_id: paymentCollection.id, provider_id: "pp_system_default" } })
      } else if (paymentCollection.status === "authorized") {
        const paymentId = paymentCollection.payments?.[0]?.id
        if (!paymentId) throw new Error("Native Medusa authorized payment has no payment id")
        await capturePaymentWorkflow(req.scope).run({ input: { payment_id: paymentId, amount: paymentCollection.amount } })
      } else if (paymentCollection.status !== "paid") {
        throw new Error(`Native Medusa payment collection is ${paymentCollection.status}`)
      }
      await markPaymentEvent(event.id, "processed")
       if (await claimEmail(String(completion.result.id))) void sendOrderPaidEmail(String(completion.result.id), intent.receipt_email ?? intent.customer_email ?? "customer@example.invalid").catch((error) => logger.error({ event: "external.email.failure", correlation_id: correlationId, order_id: String(completion.result.id), error: safeError(error) }, "order email isolated failure"))
      logger.info({ event: "payment.webhook.processed", correlation_id: correlationId, event_id: event.id, order_id: completion.result.id }, "verified payment processed")
      recordStripeWebhook("processed")
      res.status(200).json({ received: true, order_id: completion.result.id })
    } catch (error) { recordStripeWebhook("rejected"); if (eventId) await markPaymentEvent(eventId, "failed"); logger.warn({ event: "payment.webhook.rejected", correlation_id: correlationId, error: safeError(error) }, "webhook rejected"); res.status(400).json({ type: "invalid_webhook", message: "Webhook could not be verified or processed.", correlation_id: correlationId }) }
  })
}
