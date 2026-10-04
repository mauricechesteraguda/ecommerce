terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "cluster_name" {
  value = azurerm_kubernetes_cluster.this.name
}
output "oidc_issuer_url" {
  value = azurerm_kubernetes_cluster.this.oidc_issuer_url
}
output "oidc_issuer" {
  value = azurerm_kubernetes_cluster.this.oidc_issuer_url
}
output "cluster_endpoint" {
  value     = "https://${azurerm_kubernetes_cluster.this.private_fqdn}"
  sensitive = true
}
output "kube_config" {
  value     = azurerm_kubernetes_cluster.this.kube_config_raw
  sensitive = true
}
