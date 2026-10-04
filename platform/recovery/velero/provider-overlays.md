# Velero provider overlay contract

| Provider | Object storage | Identity mechanism | Repository value |
|---|---|---|---|
| AWS | private S3 bucket | IRSA role annotation | `REPLACE_WITH_WORKLOAD_IDENTITY_ROLE` |
| GCP | private GCS bucket through Velero GCP plugin | GKE Workload Identity | operator overlay only |
| Azure | private Blob container through Velero Azure plugin | AKS federated workload identity | operator overlay only |
| S3-compatible k3s target | private bucket/endpoint | workload identity or node identity, never a Git key | `REPLACE_WITH_S3_COMPATIBLE_ENDPOINT_IF_NEEDED` |

The checked-in manifest intentionally contains no provider credential Secret and
is disabled. Configure the plugin, bucket lifecycle, encryption key, and identity
binding in a protected environment overlay, then perform an operator-approved
restore drill before enabling sync.
