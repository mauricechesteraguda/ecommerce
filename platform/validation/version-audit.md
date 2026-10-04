# Kubernetes 1.35 compatibility audit

Audited 2026-10-04 from repository pins/configuration and official release
references. This repository is an unprovisioned MVP; an absent pin is not a
claim that the component is deployed or compatible.

| Component | Repository value | Finding |
|---|---|---|
| Kubernetes schema gate | `1.35.0` | Kubeconform strict validation is pinned to the 1.35.0 schema URL. |
| Terraform | `>=1.9.8 <2.0.0` | Native `fmt`/`validate` pass; no Kubernetes provider is used. |
| AWS / GCP / AzureRM | `5.70.0 / 6.12.0 / 4.15.0` | Locked and validated; AzureRM emits a provider deprecation warning for the storage account resource, not a Kubernetes incompatibility. |
| Hetzner / random | `hcloud 1.49.1 / random 3.6.3` | Locked and validated. |
| k3s | `v1.35.9+k3s1` | Enforced by Terraform variable validation and cloud-init; official release link is in `terraform/hetzner/README.md`. |
| kind node | `kindest/node:v1.35.8` | Smoke default now stays on the Kubernetes 1.35 line. Official kind release list documents the image. |
| Argo CD | no chart version | Bootstrap is disabled and contains no chart dependency; no live compatibility claim is made. Pin before enabling bootstrap. |
| Kyverno controller / CLI | CLI `1.15.2`; controller unpinned | Native policy tests pass with the pinned CLI. No controller is enabled in this checkout; pin a controller chart before deployment. |
| ingress-nginx / cert-manager / external-dns | `4.11.3 / v1.16.2 / 1.15.0` | Values-only provider contracts; no chart render or deployment is claimed here. Verify chart compatibility before enabling. |
| ESO | no chart version | Values-only/provider overlay contract; no controller is enabled or claimed live. |
| kube-prometheus-stack / Loki / Alloy | `69.8.2 / 6.24.0 / 0.12.0` | Explicit chart lock values; operator CRDs remain an external boundary. |
| Trivy Operator / Velero | no chart version | Argo Application templates have repository/chart names but no `targetRevision`; intentionally disabled/unprovisioned. Pin before enabling. |
| Helm | local executable | `helm lint`, dependency build, and templates pass; the repository does not claim a Helm binary version. |

Official references: [Kubernetes 1.35 release](https://v1-35.docs.kubernetes.io/releases/1.35),
[k3s v1.35 releases](https://github.com/k3s-io/k3s/releases),
[kind releases](https://github.com/kubernetes-sigs/kind/releases), and
[Helm Kubernetes support](https://helm.sh/docs/topics/version_skew/).

The only compatibility fix made by this audit is the kind default and the
documentation/schema consistency noted above. Unpinned disabled components are
documented constraints, not fabricated live deployment claims.
