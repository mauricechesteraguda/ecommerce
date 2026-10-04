terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "cdn_id" {
  value = try(google_compute_backend_bucket.this[0].id, null)
}
