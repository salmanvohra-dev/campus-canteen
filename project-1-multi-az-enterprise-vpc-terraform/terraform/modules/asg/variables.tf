variable "environment" {
  type        = string
  description = "Environment name (e.g., production)"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where app servers will be deployed"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for ASG instances"
}

variable "alb_security_group_id" {
  type        = string
  description = "ALB Security Group ID to allow incoming traffic from ALB"
}

variable "target_group_arn" {
  type        = string
  description = "Target Group ARN for ASG instance attachment"
}