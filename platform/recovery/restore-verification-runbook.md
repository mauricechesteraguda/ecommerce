# Restore and rollback runbook

This is an operator runbook; no restore has been executed by this repository.

1. Freeze writes and record the incident/change ID. Confirm the selected backup,
   target recovery point, owner approval, and isolated namespace/account.
2. Restore PostgreSQL using the provider PITR API or the k3s S3-compatible dump;
   restore Redis only as a cache and invalidate sessions if its data is stale.
3. Restore Kubernetes objects/PVC metadata with Velero into the isolated target.
4. Run migrations only after schema compatibility review, then check readiness,
   row counts, payment idempotency records, and a synthetic deterministic checkout.
5. Record elapsed time, recovery point, evidence links, and exceptions in
   `restore-evidence-template.md`. The target is RPO 15 minutes and RTO 4 hours;
   provider snapshot granularity, object-store lag, single-node k3s, and Redis
   cache semantics can make those targets unattainable.
6. Roll back by stopping restored workloads, preserving evidence, and switching
   traffic only after approval. Never destroy the source until retention/legal
   review is complete.
