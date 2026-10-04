terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

resource "google_artifact_registry_repository" "this" {
  location      = var.location
  repository_id = var.name
  format        = "DOCKER"
  docker_config {
    immutable_tags = true
  }
  kms_key_name = var.kms_key_name
}
