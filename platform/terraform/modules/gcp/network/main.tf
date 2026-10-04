terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

resource "google_compute_network" "this" {
  name                    = var.name
  auto_create_subnetworks = false
}
resource "google_compute_firewall" "internal" {
  name          = "${var.name}-internal"
  network       = google_compute_network.this.id
  direction     = "INGRESS"
  source_ranges = [var.cidr]
  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }
  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }
  allow { protocol = "icmp" }
}
resource "google_compute_subnetwork" "private" {
  count                    = 3
  name                     = "${var.name}-private-${count.index + 1}"
  ip_cidr_range            = cidrsubnet(var.cidr, 4, count.index)
  region                   = var.regions[count.index]
  network                  = google_compute_network.this.id
  private_ip_google_access = true
  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}
