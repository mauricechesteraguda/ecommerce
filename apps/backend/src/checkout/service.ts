// feature-10022026-Maurice: Ticket 07 checkout/payment boundary. Provider seams are
// deliberately the only place where Stripe/Resend are contacted; commerce state stays native Medusa.
import { createHmac, timingSafeEqual } from "node:crypto"
import { Pool } from "pg"
import { env } from "../config/env"
import { logger } from "../observability/logger"
import { trace, traceSync } from "../observability/trace"

export type ShippingAddress = { first_name: string; last_name: string; address_1: string; city: string; postal_code: string; country_code: "ph" | "us"; province?: string; phone?: string }
export const SHIPPING_OPTIONS = traceSync("checkout.shippingOptions", () => [
  { id: "aguda-ph-standard", name: "Philippines standard", amount: 15000, currency_code: "php", countries: ["ph"] },
  { id: "aguda-ph-express", name: "Philippines express", amount: 30000, currency_code: "php", countries: ["ph"] },
  { id: "aguda-us-standard", name: "United States standard", amount: 2500, currency_code: "usd", countries: ["us"] },
])

const pool = new Pool({ connectionString: env.DATABASE_URL, max: 5 })
let schemaReady: Promise<void> | undefined

/* c8 ignore start -- PostgreSQL/provider adapter is covered by outage/integration suites, not deterministic unit coverage. */
async function ensureSchema(): Promise<void> {
  await trace("checkout.schema", async () => {
    schemaReady ??= pool.query(`CREATE TABLE IF NOT EXISTS ecommerce_payment_events (
      event_id text PRIMARY KEY, payment_intent_id text NOT NULL, cart_id text, status text NOT NULL,
      received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz
    ); CREATE TABLE IF NOT EXISTS ecommerce_order_email_events (
      event_id text PRIMARY KEY, order_id text NOT NULL, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );` ).then(() => undefined)
    await schemaReady
  })
}
/* c8 ignore stop */

function invalid(message: string): Error { return traceSync("checkout.invalid", () => new Error(message)) }

export function validateAddress(input: unknown): ShippingAddress {
  return traceSync("checkout.validateAddress", () => {
    const value = (input ?? {}) as Record<string, unknown>
    const country = String(value.country_code ?? "").toLowerCase()
    if (country !== "ph" && country !== "us") throw invalid("Shipping is currently available only in PH and US.")
    const required = ["first_name", "last_name", "address_1", "city", "postal_code"]
    if (required.some((key) => typeof value[key] !== "string" || !String(value[key]).trim() || String(value[key]).length > 160)) throw invalid("A complete shipping address is required.")
    if ([...required, "province", "phone"].some((key) => typeof value[key] === "string" && /[\u0000-\u001f]/.test(String(value[key])))) throw invalid("Shipping address contains invalid characters.")
    if (country === "ph" && !/^\d{4}$/.test(String(value.postal_code))) throw invalid("Enter a valid four-digit Philippine postal code.")
    if (country === "us" && !/^\d{5}(?:-\d{4})?$/.test(String(value.postal_code))) throw invalid("Enter a valid US ZIP code.")
    return { first_name: String(value.first_name).trim(), last_name: String(value.last_name).trim(), address_1: String(value.address_1).trim(), city: String(value.city).trim(), postal_code: String(value.postal_code).trim(), country_code: country, province: typeof value.province === "string" ? value.province.trim() : undefined, phone: typeof value.phone === "string" ? value.phone.trim() : undefined }
  })
}

export function selectShipping(country: "ph" | "us", optionId: unknown) {
  return traceSync("checkout.selectShipping", () => {
    const option = SHIPPING_OPTIONS.find((item) => item.id === optionId && item.countries.includes(country))
    if (!option) throw invalid("Select a shipping option available for this address.")
    return option
  })
}

export async function createPaymentContract(cartId: string, amount: number, currency: string): Promise<Record<string, unknown>> {
  return trace("payment.createContract", async () => {
    if (env.PAYMENT_PROVIDER_MODE === "test-double") {
      const paymentIntentId = `pi_test_${cartId}`
      logger.info({ event: "external.payment.test_double", provider: "stripe", operation: "create_payment_intent", payment_intent_id: paymentIntentId, amount, currency }, "deterministic payment contract created")
      return { provider: "stripe", mode: "test-double", paymentIntentId, clientSecret: `${paymentIntentId}_secret_test`, publishableKey: "pk_test_double", amount, currency, status: "requires_payment_method" }
    }
    /* c8 ignore next -- live Stripe SDK adapter is intentionally excluded from local deterministic coverage. */
    const Stripe = (await import("stripe")).default
    const stripe = new Stripe(env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" })
    const intent = await stripe.paymentIntents.create({ amount, currency, metadata: { cart_id: cartId } })
    logger.info({ event: "external.payment.success", provider: "stripe", operation: "create_payment_intent", payment_intent_id: intent.id, amount, currency }, "payment contract created")
    return { provider: "stripe", mode: "stripe", paymentIntentId: intent.id, clientSecret: intent.client_secret, publishableKey: env.STRIPE_PUBLISHABLE_KEY, amount, currency, status: intent.status }
  })
}

function signatureDigest(timestamp: string, raw: Buffer, secret: string): Buffer { return traceSync("payment.signatureDigest", () => createHmac("sha256", secret).update(`${timestamp}.${raw.toString("utf8")}`).digest()) }

export function verifyWebhookSignature(raw: Buffer, header: unknown): void {
  traceSync("payment.verifyWebhookSignature", () => {
    const value = typeof header === "string" ? header : ""
    const parts = Object.fromEntries(value.split(",").map((part) => part.split("=", 2)))
    const timestamp = parts.t
    const signature = parts.v1
    const secret = env.STRIPE_WEBHOOK_SECRET ?? "test-double-webhook"
    if (!timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw invalid("Invalid payment signature.")
    const expected = signatureDigest(timestamp, raw, secret)
    const received = Buffer.from(signature, "hex")
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) throw invalid("Invalid payment signature.")
  })
}

/* c8 ignore start -- durable idempotency/email adapters are exercised with PostgreSQL/Resend outage cases. */
export async function claimPaymentEvent(eventId: string, paymentIntentId: string, cartId?: string): Promise<boolean> {
  return trace("payment.claimEvent", async () => { await ensureSchema(); const result = await pool.query("INSERT INTO ecommerce_payment_events(event_id,payment_intent_id,cart_id,status) VALUES ($1,$2,$3,'received') ON CONFLICT (event_id) DO UPDATE SET status='received', payment_intent_id=EXCLUDED.payment_intent_id, cart_id=EXCLUDED.cart_id WHERE ecommerce_payment_events.status='failed'", [eventId, paymentIntentId, cartId ?? null]); return result.rowCount === 1 })
}

export async function markPaymentEvent(eventId: string, status: "processed" | "failed"): Promise<void> {
  await trace("payment.markEvent", async () => { await ensureSchema(); await pool.query("UPDATE ecommerce_payment_events SET status=$2, processed_at=CASE WHEN $2='processed' THEN now() ELSE processed_at END WHERE event_id=$1", [eventId, status]) })
}

export async function claimEmail(orderId: string): Promise<boolean> {
  return trace("email.claimOrderPaid", async () => { await ensureSchema(); const result = await pool.query("INSERT INTO ecommerce_order_email_events(event_id,order_id,status) VALUES ($1,$2,'queued') ON CONFLICT DO NOTHING", [`order-paid:${orderId}`, orderId]); return result.rowCount === 1 })
}

export async function sendOrderPaidEmail(orderId: string, email: string): Promise<void> {
  await trace("email.sendOrderPaid", async () => {
    if (env.PAYMENT_PROVIDER_MODE === "test-double" && env.RESEND_TEST_DOUBLE_FAILURE === "1") throw new Error("deterministic Resend double failure")
    if (env.RESEND_API_KEY) {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: env.RESEND_FROM, to: email, subject: `Order ${orderId} confirmed`, text: `Your order ${orderId} is paid and confirmed.` }) })
      if (!response.ok) throw new Error("Resend rejected order confirmation")
      logger.info({ event: "external.email.success", provider: "resend", operation: "order-paid", order_id: orderId }, "order confirmation sent")
    } else logger.info({ event: "external.email.test_double", provider: "resend", operation: "order-paid", order_id: orderId }, "deterministic email delivery recorded")
    await pool.query("UPDATE ecommerce_order_email_events SET status='sent' WHERE event_id=$1", [`order-paid:${orderId}`])
  })
}
/* c8 ignore stop */
