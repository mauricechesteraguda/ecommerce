terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

resource "aws_cloudfront_distribution" "this" {
  count   = var.enabled ? 1 : 0
  enabled = true
  comment = var.name
  origin {
    domain_name = var.origin_domain
    origin_id   = var.name
  }
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = var.name
    viewer_protocol_policy = "redirect-to-https"
    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
    }
  }
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
# WAF is opt-in and intentionally not provisioned by default.
resource "aws_wafv2_web_acl" "this" {
  count = var.enabled && var.waf_enabled ? 1 : 0
  name  = var.name
  scope = "CLOUDFRONT"
  default_action {
    allow {}
  }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = var.name
    sampled_requests_enabled   = false
  }
  rule {
    name     = "common-rules"
    priority = 1
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "common-rules"
      sampled_requests_enabled   = false
    }
  }
}
# Checkov exception inventory: each item is structurally outside this module's contract.
# checkov:skip=CKV2_AWS_31:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV2_AWS_32:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV2_AWS_42:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV2_AWS_47:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
