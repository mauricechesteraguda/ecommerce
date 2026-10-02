// feature-10022026-Maurice: non-sensitive readiness seam for the P0 email contract; no order history is exposed.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { trace } from "../../../observability/trace"

export async function GET(_req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await trace("orderPaidEmail.status.GET", async () => { res.status(200).json({ status: "ready", lifecycle: "order-paid-only" }) })
}
