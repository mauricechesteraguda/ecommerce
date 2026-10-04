terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "secret_names" {
  value     = var.secret_names
  sensitive = true
}
