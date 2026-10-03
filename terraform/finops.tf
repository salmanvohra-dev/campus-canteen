# AWS Budget - Cost Guardrail ($20/month limit)
resource "aws_budgets_budget" "cost_guardrail" {
  name         = "smartbite-monthly-budget"
  budget_type  = "COST"
  limit_amount = "20.00"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["Project$SmartBite"]
  }

  # Alert agar budget ka 80% kharch ho jaye
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["voras7998@gmail.com"] # <-- Yahan apni email ID daal dena
  }

  # Alert agar forecast ho ki budget cross hone wala hai
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["voras7998@gmail.com"] # <-- Yahan apni email ID daal dena
  }
}