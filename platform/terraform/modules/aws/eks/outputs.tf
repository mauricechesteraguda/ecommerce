terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "cluster_name" {
  value = aws_eks_cluster.this.name
}
output "cluster_endpoint" {
  value     = aws_eks_cluster.this.endpoint
  sensitive = true
}
output "oidc_issuer" {
  value = aws_eks_cluster.this.identity[0].oidc[0].issuer
}
output "oidc_issuer_url" {
  value = aws_eks_cluster.this.identity[0].oidc[0].issuer
}
output "node_group_name" {
  value = aws_eks_node_group.this.node_group_name
}
