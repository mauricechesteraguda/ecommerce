// gitops-10042026-Maurice: deterministic GitOps contract validation with structured logs and trace spans.
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const runId = process.env.PLATFORM_SESSION ?? `gitops-${process.pid}`
const emit = (event, fields = {}) => process.stdout.write(`${JSON.stringify({ level: event.endsWith("failure") || event.endsWith("exception") ? "error" : "info", event, component: "gitops-validator", run_id: runId, ...fields })}\n`)
const traced = (name, fn) => { emit("function.enter", { name }); try { const result = fn(); emit("function.exit", { name }); return result } catch (error) { emit("function.exception", { name, error: error instanceof Error ? { class: error.constructor.name, message: error.message.slice(0, 300) } : { class: "unknown" } }); throw error } }
const read = (relative) => readFileSync(join(root, relative), "utf8")
const requireText = (text, needle, file) => { if (!text.includes(needle)) throw new Error(`${file}: missing ${needle}`) }

traced("validateGitOps", () => {
  const appSet = read("platform/gitops/applicationsets/targets.yaml")
  const targetCount = (appSet.match(/- \{ provider: /g) ?? []).length
  if (targetCount !== 10) throw new Error(`expected 10 generated targets, found ${targetCount}`)
  for (const file of ["platform/gitops/apps/root.yaml", "platform/gitops/apps/layers.yaml", "platform/gitops/projects/platform.yaml"]) requireText(read(file), "apiVersion: argoproj.io/v1alpha1", file)
  requireText(appSet, "automated:", "targets.yaml"); requireText(appSet, "selfHeal: true", "targets.yaml"); requireText(appSet, "PruneLast=true", "targets.yaml")
  for (const environment of ["dev", "staging", "prod"]) {
    const text = read(`platform/gitops/promotion/${environment}.yaml`)
    if (environment !== "dev" && text.split("\n").some((line) => line.includes("tag:") && !line.includes('tag: ""'))) throw new Error(`${environment}: mutable tag is forbidden`)
    if (environment !== "dev" && (text.match(/sha256:[0-9a-f]{64}/g) ?? []).length !== 3) throw new Error(`${environment}: all images require immutable digests`)
  }
  const environments = readdirSync(join(root, "platform/gitops/environments")).filter((file) => file.endsWith(".yaml"))
  if (environments.length !== 10) throw new Error(`expected 10 environment inputs, found ${environments.length}`)
  emit("gitops.valid", { targets: targetCount, environments: environments.length, promotionEnvironments: 3 })
})
