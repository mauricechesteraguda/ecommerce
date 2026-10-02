// feature-10022026-Maurice: login-gated checkout prepares native Medusa cart completion and Payment Element data.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createPaymentCollectionForCartWorkflowId, addShippingMethodToCartWorkflowId, createShippingOptionsWorkflowId } from "@medusajs/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { trace } from "../../../observability/trace"
import { logger } from "../../../observability/logger"
import { createPaymentContract, selectShipping, validateAddress } from "../../../checkout/service"

async function ensureNativeShippingOption(scope: any, option: { id: string; name: string; amount: number; currency_code: string; countries: string[] }): Promise<string> {
  return trace("checkout.ensureNativeShippingOption", async () => {
    const fulfillment = scope.resolve(Modules.FULFILLMENT) as any
    const profiles = await fulfillment.listShippingProfiles({ name: "Default Shipping Profile" })
    const createdProfile = profiles[0] ?? await fulfillment.createShippingProfiles({ name: "Default Shipping Profile", type: "default" })
    const profile = Array.isArray(createdProfile) ? createdProfile[0] : createdProfile
    let zones = await fulfillment.listServiceZones({ name: `Ticket 07 ${option.countries[0]}` })
    if (!zones[0]) {
      const sets = await fulfillment.createFulfillmentSets({ name: `Ticket 07 ${option.countries[0]}`, type: "shipping", service_zones: [{ name: `Ticket 07 ${option.countries[0]}`, geo_zones: [{ type: "country", country_code: option.countries[0] }] }] })
      const set = Array.isArray(sets) ? sets[0] : sets
      zones = await fulfillment.listServiceZones({ fulfillment_set_id: set.id })
    }
    const existing = await fulfillment.listShippingOptions({ name: option.name })
    if (existing[0]) return existing[0].id
    const workflow = scope.resolve(Modules.WORKFLOW_ENGINE) as any
    const created = await workflow.run(createShippingOptionsWorkflowId, { input: [{ name: option.name, service_zone_id: zones[0].id, shipping_profile_id: profile.id, provider_id: "manual_manual", type: { label: option.name, description: option.name, code: option.id }, price_type: "flat", prices: [{ amount: option.amount, currency_code: option.currency_code }] }] })
    return created.result[0].id
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await trace("checkout.api.POST", async () => {
    const correlationId = String(req.headers["x-correlation-id"] ?? crypto.randomUUID()); res.setHeader("x-correlation-id", correlationId)
    if (!(req as any).auth_context?.actor_id) { res.status(401).json({ type: "authentication_required", message: "Sign in before checkout.", correlation_id: correlationId }); return }
    try {
      const body = (req.body ?? {}) as Record<string, unknown>; const cartId = String(body.cart_id ?? ""); if (!cartId) throw new Error("cart_id is required")
      const address = validateAddress(body.shipping_address); const option = selectShipping(address.country_code, body.shipping_option_id)
      const cart = req.scope.resolve(Modules.CART) as any; await cart.updateCarts(cartId, { shipping_address: address, tax_total: 0 })
      const workflow = req.scope.resolve(Modules.WORKFLOW_ENGINE) as any
      const nativeShippingOptionId = await ensureNativeShippingOption(req.scope, option)
      await workflow.run(addShippingMethodToCartWorkflowId, { input: { cart_id: cartId, options: [{ id: nativeShippingOptionId }] } })
      const paymentCollection = await workflow.run(createPaymentCollectionForCartWorkflowId, { input: { cart_id: cartId, metadata: { tax_total: 0, shipping_option_id: option.id } } })
      const contract = await createPaymentContract(cartId, Number(paymentCollection.result?.amount ?? body.amount ?? option.amount), String(body.currency_code ?? option.currency_code))
      if (contract.mode === "test-double" && paymentCollection.result?.id) {
        const payment = req.scope.resolve(Modules.PAYMENT) as any
        const session = await payment.createPaymentSession(paymentCollection.result.id, { provider_id: "pp_system_default", currency_code: String(body.currency_code ?? option.currency_code), amount: Number(paymentCollection.result.amount), data: { payment_intent_id: contract.paymentIntentId }, metadata: { test_double: true } })
        await payment.updatePaymentSession({ id: session.id, currency_code: String(body.currency_code ?? option.currency_code), amount: Number(paymentCollection.result.amount), data: { payment_intent_id: contract.paymentIntentId }, status: "authorized", metadata: { test_double: true } })
        await payment.authorizePaymentSession(session.id, { test_double: true })
      }
      logger.info({ event: "checkout.api.exit", correlation_id: correlationId, cart_id: cartId, shipping_option_id: option.id, tax_total: 0 }, "checkout prepared")
      res.status(200).json({ cart_id: cartId, address, shipping: option, tax_total: 0, payment: contract })
    } catch (error) { logger.warn({ event: "checkout.api.rejected", correlation_id: correlationId, error }, "checkout request rejected"); res.status(400).json({ type: "invalid_checkout", message: error instanceof Error ? error.message : "Checkout could not be prepared.", correlation_id: correlationId }) }
  })
}
