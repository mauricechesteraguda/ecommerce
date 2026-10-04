terraform {
  required_version = ">= 1.9.8, < 2.0.0"
  required_providers {
    google = { source = "hashicorp/google", version = "= 6.12.0" }
  }
}

variable "project_id" { type = string }
variable "gcp_service_account" { type = string }
variable "kubernetes_namespace" { type = string }
variable "kubernetes_service_account" {
  type    = string
  default = "aguda-secrets"
}

resource "google_project_iam_member" "eso" {
  for_each = toset(var.secret_names)
  project  = var.project_id
  role     = "roles/secretmanager.secretAccessor"
  member   = "serviceAccount:${var.gcp_service_account}"
}
resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${var.gcp_service_account}"
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.kubernetes_namespace}/${var.kubernetes_service_account}]"
}
output "service_account" { value = var.gcp_service_account }
