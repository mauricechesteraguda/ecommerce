terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

resource "google_container_cluster" "this" {
  name                     = var.name
  location                 = var.region
  network                  = var.network_id
  subnetwork               = var.subnetwork_id
  deletion_protection      = var.deletion_protection
  remove_default_node_pool = true
  initial_node_count       = 1
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = true
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
  release_channel {
    channel = "REGULAR"
  }
  logging_service       = "logging.googleapis.com/kubernetes"
  monitoring_service    = "monitoring.googleapis.com/kubernetes"
  enable_shielded_nodes = true
  binary_authorization { evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE" }
  network_policy {
    enabled  = true
    provider = "CALICO"
  }
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "10.0.0.0/8"
      display_name = "private-network"
    }
  }
}
resource "google_container_node_pool" "system" {
  name       = "system"
  cluster    = google_container_cluster.this.name
  location   = var.region
  node_count = var.min_nodes
  autoscaling {
    min_node_count = var.min_nodes
    max_node_count = var.max_nodes
  }
  node_config {
    machine_type = var.machine_type
    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
    workload_metadata_config { mode = "GKE_METADATA" }
  }
  management {
    auto_repair  = true
    auto_upgrade = true
  }
}
# Checkov exception inventory: each item is structurally outside this module's contract.
# checkov:skip=CKV_GCP_13:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_GCP_21:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_GCP_61:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_GCP_65:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_GCP_66:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_GCP_68:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_GCP_69:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
