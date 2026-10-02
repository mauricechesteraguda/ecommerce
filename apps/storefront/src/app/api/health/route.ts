// infra-10022026-Maurice: host and Compose health probe with no dependency calls.
export function GET(): Response {
  return Response.json({ status: "ok", service: "storefront" })
}
