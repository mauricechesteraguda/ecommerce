import { redirect } from "next/navigation"
import { traceSync } from "../../observability/trace"

// hardening-10022026-Maurice: runtime redirect must follow the supervisor's
// dynamically allocated backend port; public env values are build-time inlined.
export const dynamic = "force-dynamic"

// Native Medusa dashboard entry point; this app does not duplicate administration UI.
export default function AdminEntry(): never {
  return traceSync("admin.nativeDashboard.redirect", () => redirect(`${process.env.MEDUSA_BACKEND_URL ?? process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"}/app`))
}
