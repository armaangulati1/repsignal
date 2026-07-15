output "website_endpoint" {
  description = "Static-site endpoint for the hosted web dashboard."
  value       = aws_s3_bucket_website_configuration.web.website_endpoint
}

output "bucket_arn" {
  description = "ARN of the S3 bucket."
  value       = aws_s3_bucket.web.arn
}
