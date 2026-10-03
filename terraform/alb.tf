# Root-level Application Load Balancer configuration

module "alb" {
  source = "./modules/alb"

  environment       = "production"
  vpc_id            = module.vpc.vpc_id            # VPC module se VPC ID aagyi
  public_subnet_ids = module.vpc.public_subnet_ids # VPC module se public subnets mil gaye ALB ke liye
}