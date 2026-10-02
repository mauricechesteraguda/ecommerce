// feature-10022026-Maurice: storefront forwards checkout intent without ever receiving card data.
import { NextRequest, NextResponse } from "next/server"
import { env } from "../../../config/env"
import { trace } from "../../../observability/trace"
import { sessionAuthorization } from "../../../lib/session-token"

export async function POST(request: NextRequest): Promise<NextResponse> {
  return trace("checkout.proxy.POST", async () => {
    const response = await fetch(`${env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/checkout`, { method: "POST", headers: { "content-type": "application/json", cookie: request.headers.get("cookie") ?? "", "x-correlation-id": crypto.randomUUID(), "x-publishable-api-key": env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY, ...(sessionAuthorization(request) ? { authorization: sessionAuthorization(request) as string } : {}) }, body: await request.text(), cache: "no-store" })
    return NextResponse.json(await response.json(), { status: response.status })
  })
}
