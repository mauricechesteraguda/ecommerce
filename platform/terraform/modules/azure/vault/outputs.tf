terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "secret_ids" {
  value     = var.secret_ids
  sensitive = true
}
