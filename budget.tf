resource "aws_budgets_budget" "cost" {
  name         = "monthly-budget"
  budget_type  = "COST"
  limit_amount = "5"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["voras7998@gmail.com"] # <-- YHA APNA EMAIL DAAL
  }
  tags = { CostCenter = "devops-team" }
}
