resource "terraform_data" "nonproduction_guard" {
  lifecycle {
    precondition {
      condition     = var.environment != "production"
      error_message = "Production use is prohibited by this nonproduction-only subtree."

    }

  }
}

resource "hcloud_network" "private" {
  name     = "${var.server_name}-private"
  ip_range = var.network_cidr
}

resource "hcloud_network_subnet" "private" {
  network_id   = hcloud_network.private.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = var.network_cidr
}

resource "hcloud_ssh_key" "operator" {
  name       = "${var.server_name}-operator"
  public_key = var.ssh_public_key
}

resource "random_password" "k3s_token" {
  length  = 48
  special = false
}

resource "hcloud_firewall" "node" {
  name = "${var.server_name}-least-open"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.allowed_ssh_cidrs

  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]

  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]

  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "6443"
    source_ips = [var.network_cidr]

  }
}

resource "hcloud_volume" "data" {
  count    = var.enable_volume ? 1 : 0
  name     = "${var.server_name}-data"
  size     = var.volume_size_gb
  location = var.location
  format   = "ext4"
}

resource "hcloud_server" "k3s" {
  name         = var.server_name
  server_type  = var.server_type
  location     = var.location
  image        = "ubuntu-24.04"
  ssh_keys     = [hcloud_ssh_key.operator.id]
  firewall_ids = [hcloud_firewall.node.id]
  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    k3s_token          = random_password.k3s_token.result
    kubernetes_version = var.kubernetes_version
    volume_device      = var.enable_volume ? "/dev/disk/by-id/scsi-0HC_Volume_${hcloud_volume.data[0].id}" : ""

  })
  labels = {
    environment = var.environment
    managed_by  = "terraform"
    workload    = "nonproduction-k3s"

  }

  depends_on = [terraform_data.nonproduction_guard, hcloud_network_subnet.private]
}

resource "hcloud_server_network" "private" {
  server_id  = hcloud_server.k3s.id
  network_id = hcloud_network.private.id
}

resource "hcloud_volume_attachment" "data" {
  count     = var.enable_volume ? 1 : 0
  volume_id = hcloud_volume.data[0].id
  server_id = hcloud_server.k3s.id
  automount = false
}
