terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "repository_url" {
  value = "${var.location}-docker.pkg.dev/${var.project_id}/${var.name}"
}
