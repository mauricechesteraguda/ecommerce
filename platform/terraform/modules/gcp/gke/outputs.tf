terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "cluster_name" {
  value = google_container_cluster.this.name
}
output "endpoint" {
  value     = google_container_cluster.this.endpoint
  sensitive = true
}
output "cluster_endpoint" {
  value     = google_container_cluster.this.endpoint
  sensitive = true
}
output "workload_identity_pool" {
  value = google_container_cluster.this.workload_identity_config[0].workload_pool
}
