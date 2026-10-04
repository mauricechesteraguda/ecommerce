# Schema skip inventory

The kubeconform skips are `ServiceMonitor` and `ExternalSecret`. Their OpenAPI
schemas are installed by the Prometheus and External Secrets operators, not by
this application chart. Core Kubernetes resources are validated strictly
against the pinned Kubernetes 1.35.0 schema source in
`scripts/validate-platform.mjs`. No other CRD or core kind is skipped.

Checkov inventory: `CKV_K8S_21` is skipped only for the rendered Helm package;
Helm applies the release namespace at install time and the package deliberately
omits `metadata.namespace`. This is not a workload security exception.
