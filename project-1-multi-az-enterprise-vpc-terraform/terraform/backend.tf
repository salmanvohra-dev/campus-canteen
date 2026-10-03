terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# 1. S3 Bucket for Remote State Storage
resource "aws_s3_bucket" "terraform_state" {
  bucket        = "smartbite-terraform-state-bucket-2026-xyz123"
  force_destroy = false

  lifecycle {
    prevent_destroy = false # Galti se state delete na ho jaye isliye safety lock
  }

  tags = {
    Project     = "SmartBite"
    Environment = "Production"
    ManagedBy   = "Terraform"
    CostCenter  = "DevOps-Core"
  }
}

# S3 Bucket Versioning (State history maintain karne ke liye)
resource "aws_s3_bucket_versioning" "enabled" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Server-Side Encryption (Security standard)
resource "aws_s3_bucket_server_side_encryption_configuration" "default" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Public Access Block (Strict Security - No public leaks)
resource "aws_s3_bucket_public_access_block" "public_block" {
  bucket                  = aws_s3_bucket.terraform_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 2. DynamoDB Table for State Locking (Concurrency & Race Condition prevention)
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-lock-production"
  billing_mode = "PAY_PER_REQUEST" # On-demand pricing (FinOps friendly)
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Project     = "SmartBite"
    Environment = "Production"
    ManagedBy   = "Terraform"
    CostCenter  = "DevOps-Core"
  }
}