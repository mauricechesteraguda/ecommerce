// hardening-10022026-Maurice: supervised local verification uses only its own
// process groups, dynamically allocated ports, and bounded readiness polling.
import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { createServer } from "node:net"

const root = new URL("..", import.meta.url).pathname
const children = new Set()

// hardening-10022026-Maurice: the isolated Playwright child receives only the
// non-secret publishable key from ignored env files; shell values remain authoritative.
for (const file of [".env", ".env.local", "apps/storefront/.env.local"]) {
  if (!existsSync(`${root}/${file}`)) continue
  for (const line of readFileSync(`${root}/${file}`, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?(NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY)\s*=\s*(.*?)\s*$/)
    if (match && !process.env.P0_PUBLISHABLE_API_KEY && !process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY) process.env.P0_PUBLISHABLE_API_KEY = match[2].replace(/^(["'])(.*)\1$/, "$2")
  }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

async function waitFor(url, child, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`${url} process exited before readiness (${child.exitCode ?? "signal"})`)
    try {
      const response = await fetch(url)
      if (response.status < 500) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function start(args, env) {
  const child = spawn("corepack", ["pnpm", ...args], { cwd: root, env: { ...process.env, ...env }, detached: true, stdio: "inherit" })
  children.add(child)
  child.once("exit", () => children.delete(child))
  return child
}

function stopAll() {
  for (const child of children) {
    if (child.pid && child.exitCode === null) {
      try { process.kill(-child.pid, "SIGTERM") } catch {}
    }
  }
}

process.once("SIGINT", () => { stopAll(); process.exit(130) })
process.once("SIGTERM", () => { stopAll(); process.exit(143) })

const backendPort = await freePort()
const storefrontPort = await freePort()
const backendUrl = `http://127.0.0.1:${backendPort}`
const backend = start(["--filter", "@ecommerce/backend", "dev"], { PORT: String(backendPort) })
try {
await waitFor(`${backendUrl}/health`, backend)
  const storefront = start(["--filter", "@ecommerce/storefront", "start"], { PORT: String(storefrontPort), MEDUSA_BACKEND_URL: backendUrl, NEXT_PUBLIC_MEDUSA_BACKEND_URL: backendUrl })
  await waitFor(`http://127.0.0.1:${storefrontPort}/`, storefront)
  const testArgs = ["pnpm", "exec", "playwright", "test", "--config=playwright.config.ts", "--max-failures=1"]
  if (process.env.P0_GREP) testArgs.push(`--grep=${process.env.P0_GREP}`)
  const result = spawn("corepack", testArgs, {
    cwd: root,
    env: { ...process.env, P0_API_URL: backendUrl, P0_WEB_URL: `http://127.0.0.1:${storefrontPort}` },
    stdio: "inherit",
  })
  const code = await new Promise((resolve) => result.once("exit", (status, signal) => resolve(status ?? (signal ? 1 : 0))))
  process.exitCode = code
} finally {
  stopAll()
}
