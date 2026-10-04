// feature-10042026-Maurice: private token-gated Prometheus scrape boundary.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { renderMetrics } from "../../observability/metrics"
import { trace } from "../../observability/trace"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await trace("metrics.GET", async () => {
    const expected = process.env.METRICS_TOKEN
    const authorization = req.headers.authorization
    const bearer = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice(7) : undefined
    // Prometheus Operator's bearerTokenFile is the primary contract. Keep the legacy header for existing private probes.
    const supplied = bearer ?? req.headers["x-metrics-token"]
    if (!expected || typeof supplied !== "string" || supplied !== expected) { res.status(404).json({ type: "not_found" }); return }
    res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8"); res.status(200).send(renderMetrics())
  })
}
