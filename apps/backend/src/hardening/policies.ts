// hardening-10022026-Maurice: framework-independent policy functions keep
// security, pagination, and rate-limit behavior deterministic and testable.
import { createHash } from "node:crypto"
import { traceSync } from "../observability/trace"

export function digest(value: string): string { return traceSync("hardening.digest", () => createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 16)) }
export function validAuthInput(body: Record<string, unknown>): boolean { return traceSync("hardening.authInput", () => typeof body.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) && typeof body.password === "string" && body.password.length >= 8) }
export function validateUploadFiles(files: Array<{ mimetype?: string; size?: number }>): boolean { return traceSync("hardening.upload", () => files.length > 0 && files.every((file) => file.mimetype?.startsWith("image/") && (file.size ?? Number.MAX_SAFE_INTEGER) <= 10 * 1024 * 1024)) }
export function paginate<T>(items: T[], offset: number, limit: number): T[] { return traceSync("hardening.pagination", () => { const start = Math.min(Math.max(offset, 0), 10000); return items.slice(start, start + Math.min(Math.max(limit, 1), 50)) }) }
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self',",
} as const
