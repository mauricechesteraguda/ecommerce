import { NextRequest, NextResponse } from "next/server"
import { runtimeEnv } from "../../../../config/env"
import { sessionAuthorization, sessionCookie } from "../../../../lib/session-token"

const allowed = new Set(["/auth/customer/emailpass/register", "/auth/customer/emailpass", "/store/customers", "/auth/session"])

export async function POST(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.searchParams.get("path") ?? ""
  if (!allowed.has(path)) return NextResponse.json({ message: "Unsupported account operation" }, { status: 404 })
  const response = await fetch(`${runtimeEnv.NEXT_PUBLIC_MEDUSA_BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", Accept: "application/json", cookie: request.headers.get("cookie") ?? "", "x-publishable-api-key": runtimeEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY, ...(sessionAuthorization(request) ? { authorization: sessionAuthorization(request) as string } : {}) },
    body: await request.text(),
    cache: "no-store",
  })
  const result = new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } })
  const setCookie = response.headers.get("set-cookie")
  if (setCookie) result.headers.set("set-cookie", setCookie)
  if (path === "/auth/session" && response.ok) {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (token) result.headers.append("set-cookie", sessionCookie(token))
  }
  return result
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.searchParams.get("path") ?? ""
  if (path !== "/auth/session") return NextResponse.json({ message: "Unsupported account operation" }, { status: 404 })
  const response = await fetch(`${runtimeEnv.NEXT_PUBLIC_MEDUSA_BACKEND_URL}${path}`, { method: "DELETE", headers: { Accept: "application/json", cookie: request.headers.get("cookie") ?? "", "x-publishable-api-key": runtimeEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY, ...(sessionAuthorization(request) ? { authorization: sessionAuthorization(request) as string } : {}) }, cache: "no-store" })
  return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } })
}
