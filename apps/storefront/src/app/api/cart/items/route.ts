import { NextRequest, NextResponse } from "next/server"
import { env } from "../../../../config/env"
import { sessionAuthorization } from "../../../../lib/session-token"

async function forward(request: NextRequest, method: "POST" | "PATCH"): Promise<NextResponse> {
  const body = await request.json() as { cart_id?: string; line_item_id?: string; variant_id?: string; quantity?: number }
  const cartId = String(body.cart_id ?? "")
  const lineItemId = String(body.line_item_id ?? "")
  if (!cartId || (method === "PATCH" && !lineItemId)) return NextResponse.json({ message: "cart_id and line_item_id are required" }, { status: 400 })
  const path = method === "POST" ? `/store/carts/${encodeURIComponent(cartId)}/line-items` : `/store/carts/${encodeURIComponent(cartId)}/line-items/${encodeURIComponent(lineItemId)}`
  const payload = method === "POST" ? { variant_id: body.variant_id, quantity: body.quantity ?? 1 } : { quantity: body.quantity }
  // Medusa's native line-item update is POST; keep PATCH at the same-origin UI boundary.
  const backendMethod = method === "PATCH" ? "POST" : method
  const response = await fetch(`${env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}${path}`, { method: backendMethod, headers: { "content-type": "application/json", cookie: request.headers.get("cookie") ?? "", "x-correlation-id": crypto.randomUUID(), "x-publishable-api-key": env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY, ...(sessionAuthorization(request) ? { authorization: sessionAuthorization(request) as string } : {}) }, body: JSON.stringify(payload), cache: "no-store" })
  const result = NextResponse.json(await response.json(), { status: response.status })
  const cookie = response.headers.get("set-cookie")
  if (cookie) result.headers.set("set-cookie", cookie)
  return result
}

export async function POST(request: NextRequest): Promise<NextResponse> { return forward(request, "POST") }
export async function PATCH(request: NextRequest): Promise<NextResponse> { return forward(request, "PATCH") }
