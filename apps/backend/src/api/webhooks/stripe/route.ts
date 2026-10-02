// hardening-10022026-Maurice: non-mutating webhook capability status for the
// executable P0 contract; signed POST delivery remains the mutation boundary.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { trace } from "../../../observability/trace"

export async function GET(_req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await trace("webhooks.stripe.status.GET", async () => { res.status(200).json({ status: "ready", delivery: "signed-post-only" }) })
}
