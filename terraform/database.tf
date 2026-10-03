module "database" {
  source = "./modules/database"

  vpc_id                = module.vpc.vpc_id
  subnet_id             = module.vpc.private_subnet_ids[0]
  app_security_group_id = module.asg.app_security_group_id
  environment           = "production"
} 
