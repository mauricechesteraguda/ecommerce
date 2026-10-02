// setup-10022026-Maurice: storefront environment validation without exposing secrets.
import { z } from "zod"
import { trace } from "../observability/trace"
const schema = z.object({ NEXT_PUBLIC_MEDUSA_BACKEND_URL: z.string().url(), NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY: z.string().min(1) })
export const env = schema.parse({ NEXT_PUBLIC_MEDUSA_BACKEND_URL: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000", NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY })
export async function validateEnvironment(): Promise<void> { await trace("validateEnvironment", async () => { schema.parse(env) }) }
if (process.argv[1]?.endsWith("env.ts")) void validateEnvironment()
