// feature-10042026-Maurice: dependency-free, bounded-label application metrics.
import { traceSync } from "./trace"

type Labels = Record<string, string>
type Counter = { name: string; help: string; labelNames: string[]; values: Map<string, number> }

const counters = new Map<string, Counter>()
const durations = new Map<string, { count: number; sum: number; buckets: number[] }>()
const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]

function key(labels: Labels, names: string[]): string { return names.map((name) => labels[name] ?? "").join("\u001f") }
function counter(name: string, help: string, labelNames: string[]): Counter {
  return traceSync("metrics.counter", () => {
    const existing = counters.get(name)
    if (existing) return existing
    const created = { name, help, labelNames, values: new Map<string, number>() }
    counters.set(name, created)
    return created
  })
}
function inc(name: string, help: string, labels: Labels): void {
  traceSync("metrics.counter.increment", () => {
    const metric = counter(name, help, Object.keys(labels)); const labelsKey = key(labels, metric.labelNames)
    metric.values.set(labelsKey, (metric.values.get(labelsKey) ?? 0) + 1)
  })
}

export function routeGroup(path: string): string {
  return traceSync("metrics.routeGroup", () => {
    if (path === "/health" || path === "/health/ready") return "health"
    if (path === "/metrics") return "metrics"
    if (path.startsWith("/auth")) return "auth"
    if (path.startsWith("/payments/webhooks/stripe") || path.startsWith("/webhooks/stripe")) return "stripe_webhook"
    if (path.startsWith("/store/checkout")) return "checkout"
    if (path.startsWith("/store")) return "store"
    if (path.startsWith("/admin")) return "admin"
    return "other"
  })
}

export function recordRequest(path: string, method: string, statusCode: number, durationSeconds: number): void {
  traceSync("metrics.recordRequest", () => {
    const labels = { route: routeGroup(path), method: ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method) ? method : "OTHER", status_class: `${Math.floor(statusCode / 100)}xx` }
    inc("ecommerce_http_requests_total", "Total HTTP requests.", labels)
    const duration = durations.get(`${labels.route}|${labels.method}|${labels.status_class}`) ?? { count: 0, sum: 0, buckets: Array.from({ length: buckets.length }, () => 0) }
    duration.count += 1; duration.sum += durationSeconds; buckets.forEach((limit, index) => { if (durationSeconds <= limit) duration.buckets[index] += 1 }); durations.set(`${labels.route}|${labels.method}|${labels.status_class}`, duration)
  })
}

export function recordReadiness(dependency: "database" | "redis", healthy: boolean): void { traceSync("metrics.recordReadiness", () => inc("ecommerce_readiness_dependency_health", "Readiness dependency health (1 healthy, 0 unhealthy).", { dependency, health: healthy ? "healthy" : "unhealthy" })) }
export function recordCheckout(outcome: "success" | "rejected" | "unauthenticated"): void { traceSync("metrics.recordCheckout", () => inc("ecommerce_checkout_outcomes_total", "Checkout outcomes.", { outcome })) }
export function recordStripeWebhook(outcome: "processed" | "duplicate" | "ignored" | "rejected"): void { traceSync("metrics.recordStripeWebhook", () => inc("ecommerce_stripe_webhook_outcomes_total", "Stripe webhook outcomes.", { outcome })) }
export function recordAuthThrottle(outcome: "accepted" | "rejected" | "limited" | "unavailable"): void { traceSync("metrics.recordAuthThrottle", () => inc("ecommerce_auth_throttle_outcomes_total", "Authentication throttle outcomes.", { outcome })) }

function labelsText(labels: string[], values: string): string { const parts = values.split("\u001f"); return labels.map((label, index) => `${label}="${parts[index].replaceAll(/\\|"/g, "\\$&")}"`).join(",") }
export function renderMetrics(): string {
  return traceSync("metrics.render", () => {
    const lines: string[] = []
    for (const metric of counters.values()) { lines.push(`# HELP ${metric.name} ${metric.help}`, `# TYPE ${metric.name} counter`); for (const [values, value] of metric.values) lines.push(`${metric.name}{${labelsText(metric.labelNames, values)}} ${value}`) }
    for (const [id, duration] of durations) { const [route, method, status_class] = id.split("|"); const labels = `route="${route}",method="${method}",status_class="${status_class}"`; lines.push(`# HELP ecommerce_http_request_duration_seconds HTTP request duration.`, `# TYPE ecommerce_http_request_duration_seconds histogram`); duration.buckets.forEach((value, index) => lines.push(`ecommerce_http_request_duration_seconds_bucket{${labels},le="${buckets[index]}"} ${value}`)); lines.push(`ecommerce_http_request_duration_seconds_bucket{${labels},le="+Inf"} ${duration.count}`, `ecommerce_http_request_duration_seconds_sum{${labels}} ${duration.sum}`, `ecommerce_http_request_duration_seconds_count{${labels}} ${duration.count}`) }
    return `${lines.join("\n")}\n`
  })
}
