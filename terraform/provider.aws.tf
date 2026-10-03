provider "aws" {
  region = "us-east-1"

  # Industry Standard: Default tags jo har resource par apne aap apply ho jayein
  default_tags {
    tags = {
      Project     = "SmartBite"
      Environment = "Production"
      ManagedBy   = "Terraform"
      CostCenter  = "DevOps-Core"
    }
  }
}