// setup-10022026-Maurice: storefront environment validation without exposing secrets.
import { z } from "zod"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { trace } from "../observability/trace"

// hardening-10022026-Maurice: support root .env plus ignored storefront overrides.
function loadLocalEnvironment(): void {
  const shellKeys = new Set(Object.keys(process.env))
  const files = [resolve(process.cwd(), ".env"), resolve(process.cwd(), ".env.local"), resolve(process.cwd(), "apps/storefront/.env.local"), resolve(process.cwd(), "../../.env"), resolve(__dirname, "../../../.env"), resolve(__dirname, "../../.env.local")]
  for (const file of [...new Set(files)]) {
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
      if (!match || shellKeys.has(match[1])) continue
      process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2").replace(/\s+#.*$/, "")
    }
  }
}
loadLocalEnvironment()
const schema = z.object({ NEXT_PUBLIC_MEDUSA_BACKEND_URL: z.string().url(), NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY: z.string().min(1) })
export const env = schema.parse({ NEXT_PUBLIC_MEDUSA_BACKEND_URL: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000", NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY })
export async function validateEnvironment(): Promise<void> { await trace("validateEnvironment", async () => { schema.parse(env) }) }
if (process.argv[1]?.endsWith("env.ts")) void validateEnvironment()
