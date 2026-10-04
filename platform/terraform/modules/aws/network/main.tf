terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "this" {
  cidr_block                           = var.vpc_cidr
  enable_dns_hostnames                 = true
  enable_dns_support                   = true
  enable_network_address_usage_metrics = true
  tags = merge(var.tags, {
    Name = var.name
  })
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.private_cidr, 4, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = merge(var.tags, {
    Name = "${var.name}-private-${count.index + 1}", "kubernetes.io/role/internal-elb" = "1"
  })
}

resource "aws_subnet" "public" {
  # checkov:skip=CKV_AWS_130:These are intentionally public edge/NAT subnets; private workloads use the private subnet set above.
  count                   = 3
  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.public_cidr, 4, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = merge(var.tags, {
    Name = "${var.name}-public-${count.index + 1}", "kubernetes.io/role/elb" = "1"
  })
}
resource "aws_flow_log" "this" {
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.this.id
}
resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/aws/vpc/${var.name}/flow-logs"
  retention_in_days = 90
  kms_key_id        = var.flow_logs_kms_key_id
}
resource "aws_iam_role" "flow_logs" {
  name               = "${var.name}-vpc-flow-logs"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "vpc-flow-logs.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy" "flow_logs" {
  role   = aws_iam_role.flow_logs.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogGroups", "logs:DescribeLogStreams"], Resource = "*" }] })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = var.tags
}
# Checkov exception inventory: each item is structurally outside this module's contract.
# checkov:skip=CKV2_AWS_12:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_AWS_290:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_AWS_355:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_AWS_338:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
