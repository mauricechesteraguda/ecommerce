variable "hcloud_token" {
  description = "Hetzner token; use TF_VAR_hcloud_token and never log it."
  type        = string
  sensitive   = true
  default     = null
}

variable "environment" {
  description = "Nonproduction environment name."
  type        = string
  default     = "nonproduction"
  validation {
    condition     = contains(["nonproduction", "dev", "staging"], var.environment)
    error_message = "Only nonproduction, dev, or staging is allowed; production is rejected."
  }
}

variable "server_name" {
  description = "Name for the single k3s server."
  type        = string
  default     = "ecommerce-k3s-nonproduction"
}

variable "server_type" {
  description = "Hetzner server type for nonproduction."
  type        = string
  default     = "cx22"
}

variable "location" {
  description = "Hetzner location for server and optional volume."
  type        = string
  default     = "fsn1"
}

variable "ssh_public_key" {
  description = "Operator SSH public key; never supply a private key."
  type        = string
  sensitive   = true
}

variable "allowed_ssh_cidrs" {
  description = "Narrow CIDRs allowed to SSH to the node."
  type        = list(string)
  default     = []
}

variable "network_cidr" {
  description = "Private network CIDR for k3s control-plane traffic."
  type        = string
  default     = "10.42.0.0/16"
}

variable "kubernetes_version" {
  description = "Pinned k3s Kubernetes release."
  type        = string
  default     = "v1.35.9+k3s1"
  validation {
    condition     = can(regex("^v1\\.35\\.[0-9]+\\+k3s1$", var.kubernetes_version))
    error_message = "The bootstrap is pinned to the Kubernetes 1.35 k3s line."
  }
}

variable "enable_volume" {
  description = "Attach one optional nonproduction data volume."
  type        = bool
  default     = true
}

variable "volume_size_gb" {
  description = "Optional volume size in GB."
  type        = number
  default     = 50
  validation {
    condition     = var.volume_size_gb >= 10 && var.volume_size_gb <= 1024
    error_message = "Volume size must be between 10 and 1024 GB."
  }
}
