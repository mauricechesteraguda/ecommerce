terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "network_id" {
  value = google_compute_network.this.id
}
output "private_subnet_ids" {
  value = google_compute_subnetwork.private[*].id
}
output "regions" {
  value = var.regions
}
