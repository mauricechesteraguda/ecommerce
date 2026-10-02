// hardening-10022026-Maurice: non-mutating auth capability status for the
// executable P0 contract; credential operations remain Medusa-native routes.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { trace } from "../../observability/trace"

export async function GET(_req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await trace("auth.status.GET", async () => { res.status(200).json({ status: "ready", mechanism: "medusa-native" }) })
}
