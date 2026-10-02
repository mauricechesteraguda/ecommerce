import { NextRequest, NextResponse } from "next/server"
import { env } from "../../../config/env"
import { trace } from "../../../observability/trace"

async function forward(request: NextRequest, method: string): Promise<NextResponse> {
  return trace(`cart.proxy.${method}`, async () => {
    const response = await fetch(`${env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/carts`, { method, headers: { "content-type": "application/json", cookie: request.headers.get("cookie") ?? "", "x-correlation-id": crypto.randomUUID(), "x-publishable-api-key": env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY }, body: method === "POST" ? await request.text() : undefined, cache: "no-store" })
    const result = NextResponse.json(await response.json(), { status: response.status })
    const cookie = response.headers.get("set-cookie")
    if (cookie) result.headers.set("set-cookie", cookie)
    return result
  })
}

export async function GET(request: NextRequest): Promise<NextResponse> { return forward(request, "GET") }
export async function POST(request: NextRequest): Promise<NextResponse> { return forward(request, "POST") }
