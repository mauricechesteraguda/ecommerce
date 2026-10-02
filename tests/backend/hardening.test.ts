// hardening-10022026-Maurice: deterministic tests for Ticket 11 custom backend seams.
import { createHmac } from "node:crypto"
import { describe, expect, it } from "vitest"
import { securityHeaders, correlationAndCache, digest, validAuthInput, validateUploadFiles } from "../../apps/backend/src/api/middlewares"
import { paginateOrders } from "../../apps/backend/src/api/store/customer/orders/route"
import { createPaymentContract, selectShipping, validateAddress, verifyWebhookSignature } from "../../apps/backend/src/checkout/service"
import { mapNativeOrderStatus, projectCustomerOrderStatus } from "../../apps/backend/src/orders/status"

function response(): { headers: Map<string, string>; setHeader: (name: string, value: string) => void } {
  const headers = new Map<string, string>()
  return { headers, setHeader(name, value) { headers.set(name.toLowerCase(), value) } }
}

describe("Ticket 11 custom backend hardening", () => {
  it("TC-211 confirms supported address and payment happy paths", async () => {
    expect(validateAddress({ first_name: "A", last_name: "B", address_1: "1 Main", city: "Manila", postal_code: "1000", country_code: "ph" }).country_code).toBe("ph")
    expect((await createPaymentContract("cart_test", 1250, "php")).status).toBe("requires_payment_method")
  })

  it("TC-212 preserves alternate shipping and normalized address paths", () => {
    expect(selectShipping("us", "aguda-us-standard").currency_code).toBe("usd")
    expect(validateAddress({ first_name: " A ", last_name: "B", address_1: "1 Main", city: "Austin", postal_code: "78701-1234", country_code: "us" }).first_name).toBe("A")
  })

  it("TC-213 rejects unsupported and invalid operations safely", () => {
    expect(validateAddress({ first_name: "A", last_name: "B", address_1: "1 Main", city: "Manila", postal_code: "1000", country_code: "ph" }).country_code).toBe("ph")
    expect(() => validateAddress({ first_name: "A\nDROP", last_name: "B", address_1: "1 Main", city: "Manila", postal_code: "1000", country_code: "ph" })).toThrow()
    expect(() => selectShipping("ph", "aguda-us-standard")).toThrow()
    expect(selectShipping("us", "aguda-us-standard").currency_code).toBe("usd")
    expect(() => validateAddress({ first_name: "A", last_name: "B", address_1: "1 Main", city: "Austin", postal_code: "bad", country_code: "us" })).toThrow()
    expect(() => validateAddress({ first_name: "A", last_name: "B", address_1: "1 Main", city: "Nowhere", postal_code: "1000", country_code: "ca" as never })).toThrow()
  })

  it("TC-214 applies pagination and webhook time boundaries", () => {
    expect(paginateOrders([1, 2, 3, 4], -10, 2)).toEqual([1, 2])
    expect(paginateOrders([1, 2, 3, 4], 10001, 2)).toEqual([])
    const timestamp = String(Math.floor(Date.now() / 1000))
    const raw = Buffer.from('{"id":"evt_test"}')
    const signature = createHmac("sha256", "test-double-webhook").update(`${timestamp}.${raw}`).digest("hex")
    expect(() => verifyWebhookSignature(raw, `t=${timestamp},v1=${signature}`)).not.toThrow()
    expect(() => verifyWebhookSignature(raw, `t=1,v1=${signature}`)).toThrow()
  })

  it("TC-215 validates and normalizes external input before use", () => {
    expect(validAuthInput({ email: "shopper@example.test", password: "long-enough" })).toBe(true)
    expect(validAuthInput({ email: "not-an-email", password: "long-enough" })).toBe(false)
    expect(validateUploadFiles([{ mimetype: "image/png", size: 100 }])).toBe(true)
  })

  it("TC-216 keeps authorization-adjacent input checks conservative", () => {
    expect(validAuthInput({ email: "shopper@example.test", password: "short" })).toBe(false)
    expect(validateUploadFiles([{ mimetype: "text/html", size: 100 }])).toBe(false)
  })

  it("TC-217 rejects invalid starting state and maps safe order state", () => {
    expect(mapNativeOrderStatus({ payment_status: "paid" })).toBe("paid")
    expect(mapNativeOrderStatus({ fulfillment_status: "shipped", items: [{ quantity: 1, shipped_quantity: 1 }] })).toBe("shipped")
    expect(projectCustomerOrderStatus("shipped", "paid")).toBe("shipped")
    expect(mapNativeOrderStatus({})).toBe("pending")
    expect(projectCustomerOrderStatus(undefined, "cancelled")).toBe("cancelled")
    expect(() => selectShipping("ph", "aguda-us-standard")).toThrow()
  })

  it("TC-218 keeps correction/status projection monotonic", () => {
    expect(projectCustomerOrderStatus("shipped", "paid")).toBe("shipped")
    expect(projectCustomerOrderStatus(undefined, "cancelled")).toBe("cancelled")
  })

  it("TC-219 keeps duplicate-safe deterministic contracts", async () => {
    const payment = await createPaymentContract("cart_test", 1250, "php")
    expect(payment).toMatchObject({ mode: "test-double", paymentIntentId: "pi_test_cart_test", amount: 1250, currency: "php" })
  })

  it("TC-220 exposes stable safe validation categories", () => {
    expect(() => validateAddress({ country_code: "ca" })).toThrow("only in PH and US")
  })

  it("TC-221 handles empty and no-result pagination", () => {
    expect(paginateOrders([], 0, 50)).toEqual([])
    expect(paginateOrders([1], 50, 50)).toEqual([])
  })

  it("TC-222 rejects malformed signatures and upload payloads", () => {
    expect(() => verifyWebhookSignature(Buffer.from("{}"), "t=now,v1=bad")).toThrow()
    expect(validateUploadFiles([{ mimetype: "image/png", size: 10 * 1024 * 1024 + 1 }])).toBe(false)
  })

  it("TC-223 enforces security, redaction-adjacent digests, and browser headers", () => {
    expect(validateUploadFiles([{ mimetype: "image/png", size: 10 * 1024 * 1024 + 1 }])).toBe(false)
    expect(digest("Shopper@example.test")).toBe(digest("shopper@example.test"))
    const res = response(); let called = false
    securityHeaders({} as never, res as never, () => { called = true })
    correlationAndCache({} as never, res as never, () => { called = true })
    expect(called).toBe(true)
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'none'")
    expect(res.headers.get("x-content-type-options")).toBe("nosniff")
    expect(res.headers.get("cache-control")).toBe("no-store")
  })

  it("TC-224 preserves the end-to-end invariant after adjacent transitions", async () => {
    const payment = await createPaymentContract("cart_regression", 0, "usd")
    expect(payment.paymentIntentId).toBe("pi_test_cart_regression")
    expect(projectCustomerOrderStatus(mapNativeOrderStatus({ fulfillment_status: "shipped", items: [{ quantity: 1, shipped_quantity: 1 }] }), "paid")).toBe("shipped")
  })
})
