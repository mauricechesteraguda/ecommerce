terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "secret_arns" {
  value     = var.secret_arns
  sensitive = true
}
