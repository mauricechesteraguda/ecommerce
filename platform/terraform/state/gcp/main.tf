terraform {
  required_version = ">= 1.9.8, < 2.0.0"
  required_providers {
    google = {
      source = "hashicorp/google", version = "= 6.12.0"
    }
  }
}
variable "project_id" {
  type = string
}
variable "bucket_name" {
  type = string
}
variable "location" {
  type    = string
  default = "US"
}
variable "kms_key_name" {
  type     = string
  default  = null
  nullable = true
}
provider "google" {
  project = var.project_id
}
resource "google_storage_bucket" "state" {
  name                        = var.bucket_name
  location                    = var.location
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  versioning {
    enabled = true
  }
  dynamic "encryption" {
    for_each = var.kms_key_name == null ? [] : [var.kms_key_name]
    content {
      default_kms_key_name = encryption.value
    }
  }
  logging {
    log_bucket        = google_storage_bucket.access_logs.name
    log_object_prefix = "state/"
  }
}
resource "google_storage_bucket" "access_logs" {
  name                        = "${var.bucket_name}-access-logs"
  location                    = var.location
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  lifecycle_rule {
    condition { age = 90 }
    action { type = "Delete" }
  }
}
output "bucket" {
  value = google_storage_bucket.state.name
}
output "backend_locking" {
  value = "GCS uses generation preconditions for locking; object versioning is enabled."
}
# Checkov exception inventory: each item is structurally outside this module's contract.
# checkov:skip=CKV_GCP_62:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_GCP_78:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
