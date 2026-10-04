# Checkov exception audit

Audited 2026-10-04 against the working tree. The pre-fix scan had 42 Terraform
exceptions (including `CKV_AWS_300`); adding a seven-day incomplete multipart
upload abort rule remediated `CKV_AWS_300`. The remaining audit has 42 source
exceptions: 41 exact IDs passed to the directory scan and the module-local
`CKV_AWS_130` public-subnet exception. Helm has three annotation occurrences
(two IDs). No provider, severity,
wildcard, or blanket skip is used.

| Check ID | Path | Resource boundary | Category | Rationale |
|---|---|---|---|---|
| CKV2_AWS_12 | `terraform/modules/aws/network/main.tf` | network module | structurally inapplicable | Customer-owned provider control is outside the reusable module. |
| CKV2_AWS_31, CKV2_AWS_32, CKV2_AWS_42, CKV2_AWS_47 | `terraform/modules/aws/edge/main.tf` | edge module | structurally inapplicable | Customer-owned provider controls are outside the reusable module. |
| CKV2_AWS_62, CKV_AWS_18, CKV_AWS_144, CKV_AWS_145 | `terraform/state/aws/main.tf` | state bucket root | confirmed architecture tradeoff | Single-region state, isolated logging, notification, and portable AES256 choices are explicit MVP boundaries; versioning, retention, public-access blocking, and ownership controls are enabled. |
| CKV2_AWS_69, CKV_AWS_354 | `terraform/modules/aws/data/main.tf` | data module | structurally inapplicable | Customer-owned provider controls are outside the reusable module. |
| CKV_AWS_130 | `terraform/modules/aws/network/main.tf` | public edge/NAT subnets | structurally inapplicable | Edge/NAT subnets are intentionally public; workload subnets are private. |
| CKV_AWS_290, CKV_AWS_338, CKV_AWS_355 | `terraform/modules/aws/network/main.tf` | network module | structurally inapplicable | Customer-owned provider controls are outside the reusable module. |
| CKV2_AZURE_1, CKV2_AZURE_21, CKV2_AZURE_33, CKV_AZURE_206 | `terraform/state/azure/main.tf` | state root | structurally inapplicable | Customer-owned provider controls are outside the bootstrap root. |
| CKV_AZURE_117, CKV_AZURE_170, CKV_AZURE_227 | `terraform/modules/azure/aks/main.tf` | AKS module | structurally inapplicable | Customer-owned provider controls are outside the reusable cluster module. |
| CKV_AZURE_164 | `terraform/modules/azure/registry/main.tf` | registry module | confirmed architecture tradeoff | Signed-image admission is the portable trust boundary; ACR preview trust is not synthesized. |
| CKV_AZURE_165 | `terraform/modules/azure/registry/main.tf` | registry module | structurally inapplicable | Customer-owned provider control is outside the reusable module. |
| CKV_AZURE_171 | `terraform/modules/azure/aks/main.tf` | AKS module | confirmed architecture tradeoff | AzureRM 4.15.0 lacks the newer upgrade-channel argument; provider-managed upgrades remain explicit. |
| CKV2_GCP_13, CKV_GCP_6, CKV_GCP_57, CKV_GCP_79, CKV_GCP_108, CKV_GCP_109, CKV_GCP_110, CKV_GCP_111 | `terraform/modules/gcp/data/main.tf` | data module | structurally inapplicable | Customer-owned provider controls are outside the reusable module. |
| CKV_GCP_13, CKV_GCP_21, CKV_GCP_61, CKV_GCP_65, CKV_GCP_66, CKV_GCP_68, CKV_GCP_69 | `terraform/modules/gcp/gke/main.tf` | GKE module | structurally inapplicable | Customer-owned provider controls are outside the reusable cluster module. |
| CKV_GCP_62, CKV_GCP_78 | `terraform/state/gcp/main.tf` | state root | structurally inapplicable | Customer-owned provider controls are outside the bootstrap root. |
| CKV_K8S_21 | rendered Helm output | release namespace | example-only false positive | Helm supplies the release namespace; the chart intentionally omits `metadata.namespace`. |
| CKV_K8S_35 | rendered Deployment | ESO-backed `envFrom` | example-only false positive | Secret values are external; committing literals would weaken the contract. |
| CKV_K8S_43 | rendered Deployment and Job | image helper | example-only false positive | Dev deliberately uses mutable audit images; staging/prod require digest values. |

The command-line skips remain exact IDs and are limited to the corresponding
native scan; no broad policy or severity skip is present. `CKV_AWS_300` is no
longer skipped.
