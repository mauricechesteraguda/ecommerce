// validation-10042026-Maurice: bounded local smoke; no cloud/Argo/ESO claim.
import { spawnSync } from "node:child_process"
import { randomUUID } from "node:crypto"
const name = `ecommerce-platform-${randomUUID().slice(0, 8)}`
const emit = (event, fields = {}) => process.stdout.write(`${JSON.stringify({ level: event.includes("fail") ? "error" : "info", event, component: "kind-platform-smoke", run_id: name, cluster: name, ...fields })}\n`)
const run = (args) => { const r = spawnSync("kind", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); if ((r.status ?? 1) !== 0) { emit("smoke.command.failure", { operation: args[0], exit_code: r.status ?? 1, diagnostic: String(r.stderr || r.stdout || "unknown").replace(/\s+/g, " ").slice(0, 300) }); throw new Error(`kind ${args[0]} failed`) } return r }
const localBaseline = "kindest/node:v1.35.8"
const nodeImage = process.env.KIND_NODE_IMAGE ?? localBaseline
emit("smoke.preflight", { docker: Boolean(spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0), ports: "not-bound", resources: "kind-managed" })
if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0) throw new Error("Docker daemon unavailable; kind smoke not deployed")
let created = false
try {
  run(["create", "cluster", "--name", name, "--image", nodeImage]); created = true
  run(["get", "clusters"])
  emit("smoke.evidence", { status: "cluster-created", claim_boundary: "local schema/render smoke only; no Argo, cloud, or ESO integration" })
} finally { if (created) { const r = spawnSync("kind", ["delete", "cluster", "--name", name], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); emit("smoke.cleanup", { exit_code: r.status ?? 1, diagnostic: r.status === 0 ? undefined : String(r.stderr || r.stdout || "unknown").replace(/\s+/g, " ").slice(0, 300) }) } }
