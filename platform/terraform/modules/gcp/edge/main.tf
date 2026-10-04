terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

resource "google_compute_backend_bucket" "this" {
  count       = var.enabled ? 1 : 0
  name        = var.name
  bucket_name = var.bucket_name
  enable_cdn  = true
}
