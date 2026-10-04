// validation-10042026-Maurice: Checkov Kubernetes runner/result boundary.
// A zero exit code is not a valid scan if Checkov selected no runner or saw no
// resources. Keep this parser dependency-free so the regression is deterministic.
export function countKubernetesResources(rendered) {
  return rendered
    .split(/^---\s*$/m)
    .filter((document) => /^\s*(?:apiVersion|kind):\s*\S+/m.test(document) && /^\s*kind:\s*\S+/m.test(document))
    .length
}

function parseJson(output) {
  const source = output.trim()
  const start = source.indexOf("{")
  if (start < 0) throw new Error("Checkov returned no JSON result")
  let depth = 0; let quoted = false; let escaped = false
  for (let index = start; index < source.length; index += 1) {
    const character = source[index]
    if (quoted) { if (escaped) escaped = false; else if (character === "\\") escaped = true; else if (character === '"') quoted = false; continue }
    if (character === '"') quoted = true
    else if (character === "{") depth += 1
    else if (character === "}" && --depth === 0) {
      try { return JSON.parse(source.slice(start, index + 1)) } catch (error) { throw new Error(`Checkov JSON result is invalid: ${error.message}`) }
    }
  }
  throw new Error("Checkov JSON result is incomplete")
}

function resultResources(result) {
  const resources = new Set()
  for (const check of Object.values(result.check_type_results ?? {})) {
    for (const item of [...(check?.results?.passed ?? []), ...(check?.results?.failed ?? []), ...(check?.results?.skipped ?? [])]) {
      if (item.resource) resources.add(item.resource)
    }
  }
  return resources.size
}

export function assertCheckovScan(output, renderedResourceCount) {
  if (/There are no runners to run/i.test(output)) throw new Error("Checkov Kubernetes scan has no runners to run")
  if (!renderedResourceCount || renderedResourceCount < 1) throw new Error("Checkov Kubernetes scan has zero rendered resources")
  const result = parseJson(output)
  const summary = result.summary ?? {}
  const scannedResources = Number(summary.resource_count ?? 0) || resultResources(result)
  if (scannedResources < 1) throw new Error("Checkov Kubernetes scan has zero scanned resources")
  return {
    rendered_resources: renderedResourceCount,
    scanned_resources: scannedResources,
    passed: Number(summary.passed ?? 0),
    failed: Number(summary.failed ?? 0),
    skipped: Number(summary.skipped ?? 0),
  }
}
