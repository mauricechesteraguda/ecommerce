import { NextRequest, NextResponse } from "next/server"
import { env } from "../../../../config/env"
import { trace } from "../../../../observability/trace"

export async function GET(request: NextRequest): Promise<NextResponse> {
  return trace("account.orders.proxy.GET", async () => {
    const correlationId = request.headers.get("x-correlation-id") ?? crypto.randomUUID()
    const response = await fetch(`${env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/customer/orders${request.nextUrl.search}`, { headers: { Accept: "application/json", cookie: request.headers.get("cookie") ?? "", "x-correlation-id": correlationId }, cache: "no-store" })
    const body = await response.text()
    const result = new NextResponse(body, { status: response.status, headers: { "content-type": "application/json", "x-correlation-id": response.headers.get("x-correlation-id") ?? correlationId } })
    return result
  })
}
