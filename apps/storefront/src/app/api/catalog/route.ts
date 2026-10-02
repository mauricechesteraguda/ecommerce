import { NextRequest, NextResponse } from "next/server"
import { trace } from "../../../observability/trace"
import { runtimeEnv } from "../../../config/env"

// feature-10022026-Maurice: same-origin proxy keeps browser catalog calls within the storefront boundary.
const API = runtimeEnv.NEXT_PUBLIC_MEDUSA_BACKEND_URL

export async function GET(request: NextRequest): Promise<NextResponse> {
  return trace("catalog.proxy.GET", async () => {
    const response = await fetch(`${API}/catalog${request.nextUrl.search}`, { headers: { Accept: "application/json", "x-publishable-api-key": runtimeEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY }, cache: "no-store" })
    return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": "application/json" } })
  })
}
