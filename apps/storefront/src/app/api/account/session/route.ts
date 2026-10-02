// feature-10022026-Maurice: session probe used only for checkout access control.
import { NextRequest, NextResponse } from "next/server"
import { env } from "../../../../config/env"
import { trace } from "../../../../observability/trace"

export async function GET(request: NextRequest): Promise<NextResponse> {
  return trace("account.session.proxy", async () => { const response = await fetch(`${env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/customers/me`, { headers: { cookie: request.headers.get("cookie") ?? "", Accept: "application/json" }, cache: "no-store" }); return NextResponse.json({ authenticated: response.ok }, { status: response.ok ? 200 : 401 }) })
}
