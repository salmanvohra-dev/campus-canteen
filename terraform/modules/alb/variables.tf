variable "environment" {
  type        = string
  description = "Environment name (e.g., production)"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where ALB will be deployed"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "List of public subnet IDs for Internet-Facing ALB"
}

