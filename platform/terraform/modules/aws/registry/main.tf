terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

resource "aws_ecr_repository" "this" {
  name                 = var.name
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }
}
resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1, description = "retain recent images", selection = {
        tagStatus = "any", countType = "imageCountMoreThan", countNumber = var.retention_count
        }, action = {
        type = "expire"
      }
    }]
  })
}
