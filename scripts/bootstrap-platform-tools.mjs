// validation-10042026-Maurice: fail-closed, pinned native-tool bootstrap.
// modification-10042026-Maurice: error diagnostics use the shared path/secret/PII redaction boundary.
// Artifacts and venvs live only in the OS temp/cache directory.
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { arch, homedir, platform } from "node:os"
import { join, dirname } from "node:path"

const versions = { tflint: "0.59.1", checkov: "3.2.455", kubeconform: "0.7.0", kyverno: "1.15.2", actionlint: "1.7.7" }
const platformName = platform(); const architecture = arch()
const target = platformName === "darwin" && architecture === "arm64" ? "darwin-arm64" : platformName === "darwin" && architecture === "x64" ? "darwin-amd64" : platformName === "linux" && architecture === "arm64" ? "linux-arm64" : platformName === "linux" && architecture === "x64" ? "linux-amd64" : null
if (!target) throw new Error(`unsupported platform/architecture: ${platformName}/${architecture}`)
const defaultCacheRoot = platformName === "darwin"
  ? join(homedir(), "Library", "Caches", "ecommerce-platform-tools")
  : join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "ecommerce-platform-tools")
const cache = process.env.PLATFORM_TOOL_CACHE ?? join(defaultCacheRoot, "v3", `${platformName}-${architecture}`)
const metadataPath = join(cache, "verified-tools.json"); mkdirSync(cache, { recursive: true })
const lockPath = join(cache, ".bootstrap.lock")
const sleepSync = (milliseconds) => { const shared = new Int32Array(new SharedArrayBuffer(4)); Atomics.wait(shared, 0, 0, milliseconds) }
let lockHeld = false
for (;;) {
  try { mkdirSync(lockPath); lockHeld = true; break } catch (error) {
    if (error?.code !== "EEXIST") throw error
    try {
      if (Date.now() - (readFileSync(join(lockPath, "started-at"), "utf8") * 1) > 300000) rmSync(lockPath, { recursive: true, force: true })
    } catch {}
    sleepSync(100)
  }
}
writeFileSync(join(lockPath, "started-at"), String(Date.now()))
const releaseLock = () => { if (lockHeld) { lockHeld = false; rmSync(lockPath, { recursive: true, force: true }) } }
process.on("exit", releaseLock)
let prior = { tools: {} }
try { if (existsSync(metadataPath)) prior = JSON.parse(readFileSync(metadataPath, "utf8")) } catch { prior = { tools: {} } }
const runId = process.env.PLATFORM_SESSION ?? `tool-bootstrap-${process.pid}`
const sanitizeDiagnostic = (value) => String(value ?? "unknown")
  .replace(/(?:bearer\s+|basic\s+)[^\s,;}]+/gi, "[REDACTED]")
  .replace(/(?:[?&](?:[^=&#\s]+)=)[^&#\s]+/gi, "$1[REDACTED]")
  .replace(/(?:authorization|cookie|set-cookie|token|secret|password|access[_-]?key|refresh[_-]?token|client[_-]?secret|email|phone|address|body|query|kubeconfig)\s*[:=]\s*[^\s,;}]+/gi, "$1=[REDACTED]")
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED]")
  .replace(/(?:\/(?:Users|home|private|tmp|var|opt|workspace|workspaces|root|srv|run|mnt|Volumes)\/[^\s)]+|[A-Z]:\\[^\s)]+)/g, "[PATH]")
  .replace(/\s+/g, " ").slice(0, 300)
const sanitizeFields = (value) => {
  if (typeof value === "string") return sanitizeDiagnostic(value)
  if (Array.isArray(value)) return value.map(sanitizeFields)
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeFields(item)]))
  return value
}
const log = (event, fields = {}) => process.stdout.write(`${JSON.stringify(sanitizeFields({ level: event.includes("failure") ? "error" : "info", event, component: "platform-tool-bootstrap", run_id: runId, platform: platformName, architecture, ...fields }))}\n`)
const safeError = (error, operation, remediation) => ({ class: error?.constructor?.name ?? "Error", code: typeof error?.code === "string" ? error.code.slice(0, 64) : undefined, operation, run_id: runId, message: sanitizeDiagnostic(error?.message ?? error ?? "unknown"), remediation })
const logError = (event, error, operation, remediation, fields = {}) => log(event, { ...fields, error: safeError(error, operation, remediation) })
process.on("uncaughtException", (error) => { logError("tool.bootstrap.failure", error, "tool-bootstrap", "retry the pinned tool bootstrap; inspect only local runner diagnostics"); process.exitCode = 1 })
process.on("unhandledRejection", (error) => { logError("tool.bootstrap.failure", error, "tool-bootstrap", "retry the pinned tool bootstrap; inspect only local runner diagnostics"); process.exitCode = 1 })
const timeout = Number(process.env.PLATFORM_TOOL_TIMEOUT_MS ?? 180000)
const retries = Number(process.env.PLATFORM_TOOL_RETRIES ?? 5)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const fetchBytes = async (urls) => {
  const candidates = Array.isArray(urls) ? urls : [urls]; let last
  for (let attempt = 0; attempt < retries; attempt += 1) {
    for (const url of candidates) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(timeout), headers: { "user-agent": "ecommerce-platform-validator" } })
        if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
        return Buffer.from(await response.arrayBuffer())
      } catch (error) { last = error; logError("tool.bootstrap.download.failure", error, "download-tool-artifact", "retry the pinned download or verify the official release is available", { url: url.split("?")[0], attempt: attempt + 1 }) }
    }
    if (attempt < retries - 1) await sleep(500 * (2 ** attempt))
  }
  throw last
}
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")
const release = {
  tflint: { repo: "terraform-linters/tflint", asset: () => new RegExp(`^tflint_${target === "darwin-arm64" ? "darwin_arm64" : target === "darwin-amd64" ? "darwin_amd64" : target.replace("-", "_")}\\.(zip|tar\\.gz)$`), checksum: /checksums/i },
  kubeconform: { repo: "yannh/kubeconform", asset: () => new RegExp(`^kubeconform-${target}\\.tar\\.gz$`), checksum: /checksums/i },
  kyverno: { repo: "kyverno/kyverno", asset: (v) => new RegExp(`^kyverno-cli_v${v.replaceAll(".", "\\.")}_${target.replace("-", "_")}\\.tar\\.gz$`), checksum: /checksums/i },
  actionlint: { repo: "rhysd/actionlint", asset: (v) => new RegExp(`^actionlint_${v.replaceAll(".", "\\.")}_${target === "darwin-arm64" ? "darwin_arm64" : target === "darwin-amd64" ? "darwin_amd64" : target}\\.tar\\.gz$`), checksum: /checksums/i },
}
const extract = (archive, destination) => { mkdirSync(destination, { recursive: true }); if (archive.endsWith(".zip")) execFileSync("unzip", ["-oq", archive, "-d", destination], { timeout }); else execFileSync("tar", ["-xzf", archive, "-C", destination], { timeout }) }
const checksumFromText = (text, asset) => { const line = text.split(/\r?\n/).find((candidate) => candidate.includes(asset)); return line?.match(/\b[a-f0-9]{64}\b/i)?.[0]?.toLowerCase() }
const installRelease = async (name) => {
  const version = versions[name]; const spec = release[name]; const api = `https://api.github.com/repos/${spec.repo}/releases/tags/v${version}`
  const releaseData = JSON.parse((await fetchBytes(api)).toString("utf8")); const assets = releaseData.assets ?? []
  const asset = assets.find((item) => spec.asset(version).test(item.name)); const checksumAsset = assets.find((item) => spec.checksum.test(item.name))
  if (!asset || !checksumAsset) throw new Error(`${name}: official release asset/checksum unavailable for v${version}/${target}`)
  const tag = `v${version}`; const assetUrl = [`${asset.browser_download_url}`, `https://github.com/${spec.repo}/releases/download/${tag}/${asset.name}`]; const checksumUrl = [`${checksumAsset.browser_download_url}`, `https://github.com/${spec.repo}/releases/download/${tag}/${checksumAsset.name}`]
  const archive = await fetchBytes(assetUrl); const checksums = (await fetchBytes(checksumUrl)).toString("utf8"); const expected = checksumFromText(checksums, asset.name); const actual = sha256(archive)
  if (!expected || expected !== actual) throw new Error(`${name}: checksum mismatch for ${asset.name}; expected ${expected ?? "missing"}, got ${actual}`)
  const staging = join(cache, `.staging-${name}-${process.pid}-${Date.now()}`); mkdirSync(staging, { recursive: true })
  const archivePath = join(staging, asset.name); writeFileSync(archivePath, archive); extract(archivePath, staging)
  const executable = join(staging, name === "kyverno" ? "kyverno" : name)
  if (!existsSync(executable)) throw new Error(`${name}: verified archive did not contain expected executable ${name}`)
  const destination = join(cache, `${name}-${version}`); const retired = join(cache, `.invalid-${name}-${version}-${process.pid}`); if (existsSync(destination)) renameSync(destination, retired); mkdirSync(destination, { recursive: true }); renameSync(executable, join(destination, name)); chmodSync(join(destination, name), 0o755); rmSync(staging, { recursive: true, force: true }); if (existsSync(retired)) rmSync(retired, { recursive: true, force: true })
  return { path: join(destination, name), source: asset.browser_download_url, checksum_source: checksumAsset.browser_download_url, sha256: sha256(readFileSync(join(destination, name))), version }
}
const installKyvernoContainer = async () => {
  const version = versions.kyverno; const image = `ghcr.io/kyverno/kyverno-cli:v${version}`
  try { execFileSync("docker", ["--version"], { timeout, stdio: "ignore" }) } catch (error) { logError("tool.bootstrap.container.failure", error, "check-container-runtime", "install or start Docker, then retry the Kyverno bootstrap"); throw new Error("kyverno: Docker is unavailable for official container fallback") }
  execFileSync("docker", ["pull", image], { timeout, stdio: "pipe" })
  const repoDigests = JSON.parse(execFileSync("docker", ["image", "inspect", image, "--format", "{{json .RepoDigests}}"], { timeout, encoding: "utf8" }))
  const immutable = repoDigests.find((value) => /^ghcr\.io\/kyverno\/kyverno-cli@sha256:[a-f0-9]{64}$/i.test(value))
  if (!immutable) throw new Error(`kyverno: official image did not provide an immutable ghcr.io digest for ${image}`)
  const digest = immutable.slice(immutable.indexOf("@") + 1); const pinned = `ghcr.io/kyverno/kyverno-cli@${digest}`
  const versionOutput = execFileSync("docker", ["run", "--rm", "--entrypoint", "kyverno", pinned, "version"], { timeout, encoding: "utf8" }).trim()
  if (!versionOutput.includes(version)) throw new Error(`kyverno: official container version mismatch; expected ${version}, got ${versionOutput}`)
  const destination = join(cache, `kyverno-${version}-container`); mkdirSync(destination, { recursive: true }); const wrapper = join(destination, "kyverno")
  writeFileSync(wrapper, `#!/bin/sh\nexec docker run --rm --entrypoint kyverno ${pinned} "$@"\n`, { mode: 0o755 })
  return { path: wrapper, source: "https://ghcr.io/kyverno/kyverno-cli", source_digest: digest, image: pinned, kind: "container", sha256: sha256(readFileSync(wrapper)), version }
}
const installCheckov = async () => {
  const version = versions.checkov; const api = `https://pypi.org/pypi/checkov/${version}/json`; const data = JSON.parse((await fetchBytes(api)).toString("utf8")); const wheel = data.urls.find((item) => item.filename.endsWith("py3-none-any.whl")); if (!wheel) throw new Error("checkov: official PyPI wheel unavailable")
  const wheelBytes = await fetchBytes([wheel.url, `https://files.pythonhosted.org/packages/${wheel.filename}`]); if (sha256(wheelBytes) !== wheel.digests.sha256) throw new Error(`checkov: PyPI wheel checksum mismatch for ${wheel.filename}`)
  const venv = join(cache, `checkov-${version}-venv`); if (!existsSync(join(venv, "bin", "checkov"))) execFileSync("python3", ["-m", "venv", venv], { timeout }); const wheelPath = join(cache, wheel.filename); writeFileSync(wheelPath, wheelBytes); execFileSync(join(venv, "bin", "python"), ["-m", "pip", "install", "--disable-pip-version-check", "--no-input", wheelPath], { timeout, stdio: "pipe" }); return { path: join(venv, "bin", "checkov"), source: wheel.url, checksum_source: "https://pypi.org/pypi/checkov/json", sha256: wheel.digests.sha256, version }
}
const versionArgs = { kubeconform: ["-v"], actionlint: ["-version"], kyverno: ["version"] }
const requested = process.argv.slice(2); const tools = requested.length ? requested : Object.keys(versions); const result = {}
 for (const name of tools) { if (!versions[name]) throw new Error(`unversioned required tool: ${name}`); log("tool.bootstrap.start", { tool: name, version: versions[name], target }); const cached = prior.tools?.[name]; const trustedCache = name !== "kyverno" || (cached?.kind === "container" ? /^sha256:[a-f0-9]{64}$/i.test(cached.source_digest ?? "") : /^https:\/\/github\.com\/kyverno\/kyverno\/releases\/download\/v1\.15\.2\//.test(cached?.source ?? "") && /^https:\/\/github\.com\/kyverno\/kyverno\/releases\/download\/v1\.15\.2\//.test(cached?.checksum_source ?? "")); if (trustedCache && cached?.version === versions[name] && existsSync(cached.path) && sha256(readFileSync(cached.path)) === cached.sha256) { const cachedVersion = execFileSync(cached.path, versionArgs[name] ?? ["--version"], { timeout, encoding: "utf8" }).trim(); if (!cachedVersion.includes(versions[name])) throw new Error(`${name}: cached executable version mismatch; expected ${versions[name]}, got ${cachedVersion}`); result[name] = cached; log("tool.bootstrap.reuse", { tool: name, version: versions[name], sha256: cached.sha256, kind: cached.kind ?? "binary" }); continue } try { result[name] = name === "checkov" ? await installCheckov() : await installRelease(name) } catch (error) { if (name !== "kyverno") throw error; logError("tool.bootstrap.container-fallback.start", error, `install-${name}`, "retry the official release download; if unavailable, use the pinned container fallback", { tool: name }); result[name] = await installKyvernoContainer() } const versionOutput = execFileSync(result[name].path, versionArgs[name] ?? ["--version"], { timeout, encoding: "utf8" }).trim(); if (!versionOutput.includes(versions[name])) throw new Error(`${name}: executable version mismatch; expected ${versions[name]}, got ${versionOutput}`); log("tool.bootstrap.verified", { tool: name, version: versions[name], sha256: result[name].sha256, kind: result[name].kind ?? "binary", source_digest: result[name].source_digest }) }
const metadata = JSON.stringify({ platform: platformName, architecture, target, generated_at: new Date().toISOString(), tools: { ...prior.tools, ...result } }, null, 2)
const metadataTemp = `${metadataPath}.tmp-${process.pid}`; writeFileSync(metadataTemp, metadata); renameSync(metadataTemp, metadataPath); log("tool.bootstrap.complete", { tools: Object.keys({ ...prior.tools, ...result }) })
releaseLock()
