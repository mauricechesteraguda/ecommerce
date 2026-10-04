# Azure vault seam

Use Key Vault with AKS Workload Identity. This placeholder exposes only secret
identifiers and never accepts secret material.

## Status and architecture

Live URL: **Not deployed**. This subtree is an unprovisioned contract; repository validation does not contact providers or apply infrastructure.

```mermaid
flowchart LR
  AKS[AKS service account] --> AWI[Azure Workload Identity]
  AWI --> KV[Azure Key Vault]
  KV --> ESO[External Secrets Operator]
  ESO --> Secret[Kubernetes Secret reference]
```

The canonical operational context, safety/no-apply stance, ownership, recovery
boundaries, and update instructions are in [`platform/README.md`](../../../../README.md)
(or `../../README.md` for nested Terraform modules). No diagram here is evidence
of a live deployment.
