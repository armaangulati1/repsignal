variable "aws_region" {
  description = "AWS region to host the demo static site."
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Globally unique S3 bucket name for the RepSignal web build."
  type        = string
}
