import { NextRequest, NextResponse } from "next/server"
import { env } from "../../../config/env"
import { sessionAuthorization } from "../../../lib/session-token"

const CART_COOKIE = "storefront_cart"
import { trace } from "../../../observability/trace"

async function forward(request: NextRequest, method: string): Promise<NextResponse> {
  return trace(`cart.proxy.${method}`, async () => {
    const cartId = request.cookies.get(CART_COOKIE)?.value
    const path = method === "GET" && cartId ? `/store/carts/${encodeURIComponent(cartId)}` : "/store/carts"
    const response = await fetch(`${env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}${path}`, { method, headers: { "content-type": "application/json", cookie: request.headers.get("cookie") ?? "", "x-correlation-id": crypto.randomUUID(), "x-publishable-api-key": env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY, ...(sessionAuthorization(request) ? { authorization: sessionAuthorization(request) as string } : {}) }, body: method === "POST" ? await request.text() : undefined, cache: "no-store" })
    const payload = await response.json()
    const result = NextResponse.json(payload, { status: response.status })
    if (method === "POST" && response.ok && payload.cart?.id) result.headers.append("set-cookie", `${CART_COOKIE}=${encodeURIComponent(payload.cart.id)}; Path=/; SameSite=Lax`)
    const cookie = response.headers.get("set-cookie")
    if (cookie) result.headers.set("set-cookie", cookie)
    return result
  })
}

export async function GET(request: NextRequest): Promise<NextResponse> { return forward(request, "GET") }
export async function POST(request: NextRequest): Promise<NextResponse> { return forward(request, "POST") }
