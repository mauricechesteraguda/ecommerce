output "server_ipv4" {
  description = "Public IPv4 address of the nonproduction node."
  value       = hcloud_server.k3s.ipv4_address
}

output "kubeconfig" {
  description = "Sensitive nonproduction kubeconfig representation."
  sensitive   = true
  value = yamlencode({
    apiVersion      = "v1"
    kind            = "Config"
    current-context = "default"
    clusters = [{
      name = "default"
      cluster = {
        server                   = "https://${hcloud_server.k3s.ipv4_address}:6443"
        insecure-skip-tls-verify = true
      }
    }]
    users = [{
      name = "admin"
      user = { token = random_password.k3s_token.result }
    }]
    contexts = [{
      name    = "default"
      context = { cluster = "default", user = "admin" }
    }]
  })
}

output "canonical_kubeconfig_command" {
  description = "SSH command to retrieve the canonical CA-bearing kubeconfig."
  value       = "ssh root@${hcloud_server.k3s.ipv4_address} sudo cat /etc/rancher/k3s/k3s.yaml"
}
