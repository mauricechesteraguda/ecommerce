# Provider overlay contract

Each Argo environment selects one provider file (`aws-cluster-secret-store.yaml`,
`gcp-cluster-secret-store.yaml`, or `azure-cluster-secret-store.yaml`) and one matching
Terraform module output. The shared chart is not copied per provider. Production overlays
must fail closed unless all eight `providerVaultKeys` are present. A provider overlay must
also supply the matching workload identity annotation; access keys, service-account JSON,
client secrets, and vault values are prohibited.

The Kubernetes trust subject is `system:serviceaccount:<namespace>:aguda-secrets` (AWS),
`<project>.svc.id.goog[<namespace>/aguda-secrets]` (GCP), or the Azure federated subject for
the same namespace/service account. ESO is the only component allowed to read provider vaults.

The nonproduction Hetzner k3s overlay is different: k3s has no workload identity,
so `k3s-s3-externalsecret.yaml` must materialize `aguda-backup-s3` from the
operator-selected S3-compatible `SecretStore`. Backup and restore pods disable
service-account token automount and use required `secretKeyRef` entries; a
missing ExternalSecret or key intentionally leaves the workload unschedulable.
No access-key values belong in Git.
