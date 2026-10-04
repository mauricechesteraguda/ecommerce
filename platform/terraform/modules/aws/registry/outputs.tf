terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "repository_url" {
  value = aws_ecr_repository.this.repository_url
}
output "repository_arn" {
  value = aws_ecr_repository.this.arn
}
