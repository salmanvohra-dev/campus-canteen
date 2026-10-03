variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "production"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for Public Subnets"
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for Private Subnets"
  default     = ["10.0.3.0/24", "10.0.4.0/24"]
}

variable "isolated_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for Isolated Subnets"
  default     = ["10.0.5.0/24", "10.0.6.0/24"]
}