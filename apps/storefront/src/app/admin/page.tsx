import { redirect } from "next/navigation"
import { traceSync } from "../../observability/trace"

// Native Medusa dashboard entry point; this app does not duplicate administration UI.
export default function AdminEntry(): never {
  return traceSync("admin.nativeDashboard.redirect", () => redirect(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"}/app`))
}
