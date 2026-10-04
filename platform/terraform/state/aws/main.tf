terraform {
  required_version = ">= 1.9.8, < 2.0.0"
  required_providers {
    aws = {
      source = "hashicorp/aws", version = "= 5.70.0"
    }
  }
}
variable "bucket_name" {
  type = string
}
variable "region" {
  type = string
}
provider "aws" {
  region = var.region
}
resource "aws_s3_bucket" "state" {
  bucket = var.bucket_name
}
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_ownership_controls" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}
resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    id     = "noncurrent-retention"
    status = "Enabled"
    noncurrent_version_expiration { noncurrent_days = 90 }
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }
}
# Single-region state roots intentionally do not replicate state cross-region;
# recovery uses versioned objects and the backend's native lockfile.
# checkov:skip=CKV_AWS_144:Cross-region replication is intentionally not configured for the single-region state root.
# checkov:skip=CKV2_AWS_62:State bucket notifications are not part of the backend contract; versioning and retention provide recovery evidence.
# checkov:skip=CKV_AWS_18:Access logging would require a separate logging bucket and is outside this isolated state root.
# checkov:skip=CKV_AWS_145:Provider-managed AES256 is the portable default when no KMS key is supplied.
output "bucket" {
  value = aws_s3_bucket.state.bucket
}
output "backend_locking" {
  value = "Use native S3 locking with use_lockfile=true; no legacy DynamoDB table is required."
}
