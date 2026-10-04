// feature-10042026-Maurice: bounded-label metrics contract tests (TC-PLAT-0169, TC-PLAT-0170).
import { describe, expect, it } from "vitest"
import { recordCheckout, recordReadiness, recordRequest, recordStripeWebhook, renderMetrics, routeGroup } from "../../apps/backend/src/observability/metrics"

describe("application metrics", () => {
  it("uses fixed route groups and excludes request identifiers", () => {
    expect(routeGroup("/store/checkout?cart_id=secret")).toBe("checkout")
    recordRequest("/store/checkout", "POST", 400, 0.01)
    const output = renderMetrics()
    expect(output).toContain('route="checkout"')
    expect(output).toContain('status_class="4xx"')
    expect(output).not.toContain("cart_id")
  })

  it("records bounded checkout and webhook outcomes", () => {
    recordCheckout("success"); recordCheckout("rejected"); recordStripeWebhook("duplicate")
    const output = renderMetrics()
    expect(output).toContain('outcome="success"')
    expect(output).toContain('outcome="duplicate"')
    expect(output).not.toMatch(/order|event|email|signature|token/i)
  })

  it("normalizes unknown routes and methods to bounded labels", () => {
    expect(routeGroup("/untrusted/" + "user-id")).toBe("other")
    recordRequest("/untrusted/123", "CONNECT", 503, 7)
    const output = renderMetrics()
    expect(output).toContain('route="other"')
    expect(output).toContain('method="OTHER"')
    expect(output).not.toContain("123")
  })

  it("exports dependency readiness without dependency identifiers", () => {
    recordReadiness("database", true)
    recordReadiness("redis", false)
    const output = renderMetrics()
    expect(output).toContain('dependency="database"')
    expect(output).toContain('health="unhealthy"')
    expect(output).not.toMatch(/connection|host|password|url/i)
  })
})
