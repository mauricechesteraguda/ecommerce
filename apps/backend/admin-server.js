const http = require("node:http")
const fs = require("node:fs")
const path = require("node:path")

// infra-10022026-Maurice: Medusa's production build emits the dashboard into
// `.medusa/server/public/admin`; keep it in a separate least-privilege service so the API
// process does not load the fragile development static adapter.
// `medusa build` writes the production Vite bundle here. `.medusa/client` is
// the development source tree (JSX/imports) and must never be served directly.
const root = process.env.ADMIN_STATIC_ROOT ?? "/app/apps/backend/.medusa/server/public/admin"
const backend = new URL(process.env.BACKEND_URL ?? "http://backend:9000")
const port = Number(process.env.PORT ?? 9001)
const log = (event, fields = {}) => process.stdout.write(`${JSON.stringify({ event, service: "admin", level: "info", ...fields })}\n`)

// infra-10022026-Maurice: proxy only admin API namespaces; browser assets stay
// local to this immutable image and never expose filesystem paths.
const proxiedPrefixes = ["/admin", "/auth", "/user", "/settings", "/invite", "/sessions", "/store", "/uploads"]

function proxy(req, res) {
  const request = http.request(new URL(req.url ?? "/", backend), { method: req.method, headers: req.headers }, (upstream) => {
    res.writeHead(upstream.statusCode ?? 502, upstream.headers)
    upstream.pipe(res)
  })
  request.on("error", () => {
    // infra-10022026-Maurice: redact request details and keep dependency errors
    // actionable without leaking cookies, credentials, or request bodies.
    log("proxy.error", { status: 502 })
    if (!res.headersSent) res.writeHead(502)
    res.end()
  })
  req.pipe(request)
}

function serveAsset(req, res) {
  const requestPath = new URL(req.url ?? "/", "http://admin").pathname
  if (requestPath === "/app" || requestPath === "/app/") {
    res.writeHead(302, { location: "/app/login", "cache-control": "no-store" })
    return res.end()
  }
  const relative = requestPath === "/" || requestPath === "/app" || requestPath === "/app/"
    ? "index.html"
    : requestPath.replace(/^\/app\//, "").replace(/^\//, "")
  const file = path.resolve(root, relative)
  const isNavigation = req.method === "GET" || req.method === "HEAD"
  const isAsset = path.extname(relative) !== ""
  let servedFile = file
  // SPA fallback is deliberately limited to extensionless navigation routes.
  // Missing JS/CSS/images must remain a real 404, never HTML.
  if ((!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) && isNavigation && !isAsset && requestPath.startsWith("/app")) {
    servedFile = path.join(root, "index.html")
  }
  if (!servedFile.startsWith(`${root}${path.sep}`) || !fs.existsSync(servedFile) || !fs.statSync(servedFile).isFile()) return res.writeHead(404).end()
  const types = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf" }
  const isHtml = path.extname(servedFile) === ".html"
  res.writeHead(200, {
    "content-type": types[path.extname(servedFile)] ?? "application/octet-stream",
    "cache-control": isHtml ? "no-store" : "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'self'; connect-src 'self' http: https:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; font-src 'self' data:; frame-ancestors 'none'",
    "referrer-policy": "no-referrer",
  })
  if (req.method === "HEAD") return res.end()
  fs.createReadStream(servedFile).pipe(res)
}

const server = http.createServer((req, res) => {
  const requestPath = new URL(req.url ?? "/", "http://admin").pathname
  // infra-10022026-Maurice: trace lifecycle without recording URL query data,
  // cookies, authorization headers, or request payloads.
  log("request", { method: req.method, route: requestPath.startsWith("/app") ? "/app" : requestPath })
  if (proxiedPrefixes.some((prefix) => requestPath === prefix || requestPath.startsWith(`${prefix}/`))) return proxy(req, res)
  return serveAsset(req, res)
}).listen(port, "0.0.0.0", () => log("ready", { port }))

// infra-10022026-Maurice: close the listener cleanly so Compose stop/restart
// does not leave an in-flight admin proxy or partial response behind.
for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => {
  log("shutdown", { signal })
  server.close(() => process.exit(0))
})
