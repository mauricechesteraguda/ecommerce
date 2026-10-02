import type { NextRequest } from "next/server"

const COOKIE = "storefront_session"
export function sessionAuthorization(request: NextRequest): string | undefined {
  const header = request.headers.get("authorization")
  const token = request.cookies.get(COOKIE)?.value
  return header ?? (token ? `Bearer ${token}` : undefined)
}
export const sessionCookie = (token: string): string => `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`
