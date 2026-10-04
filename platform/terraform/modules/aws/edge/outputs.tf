terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "distribution_domain_name" {
  value = try(aws_cloudfront_distribution.this[0].domain_name, null)
}
output "waf_arn" {
  value = try(aws_wafv2_web_acl.this[0].arn, null)
}
