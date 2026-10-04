# Checkov exception inventory

Every exception is an individual check ID, recorded next to the Terraform
resource it evaluates. The reusable modules already enforce their portable
controls (private networking, encryption where a key is supplied, logging,
backups, and metadata protections). The remaining provider-specific checks
require an environment-owned dependency (customer KMS/log bucket, DNS/WAF
certificate, cross-region policy, or provider billing/SLA feature) and are not
safe to synthesize in this provider-neutral MVP without changing its contract.
No framework, severity, or blanket check skip is used.

The two Azure provider-version exceptions are `CKV_AZURE_164` (ACR trust is
enforced by the repository's signed-image admission policy) and
`CKV_AZURE_171` (the pinned AzureRM 4.15 schema does not expose the newer AKS
upgrade-channel argument). They remain explicit IDs rather than a provider or
severity skip.

The complete audit, including the three rendered-chart exceptions and the one
module-local public-subnet exception, is in
[`exception-audit.md`](exception-audit.md). It records the exact check, path,
resource boundary, category, and rationale; duplicate comments are not counted
as additional exceptions.
