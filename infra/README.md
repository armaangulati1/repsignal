# infra/ - demo Terraform (NOT APPLIED)

This directory holds a minimal Terraform config that would host the built web
dashboard (`apps/web/dist`) as a static site on an AWS S3 bucket.

## Honest scope (read this)

- This config is a **demo artifact**. It has never been applied.
- No Terraform state is committed, and none exists.
- Applying it would create **real, billable AWS resources** and make an S3
  bucket publicly readable. Do not apply it without understanding the cost and
  exposure.
- It provisions one thing (an S3 static-site bucket). It is not a production
  deployment, has no CDN, TLS, CI wiring, or remote state backend, and is not
  claimed to be any of those.

## What it would do

1. Create an S3 bucket.
2. Configure it for static website hosting (`index.html`).
3. Attach a public-read bucket policy so the site is reachable.

## Shape of a real run (illustrative, do not execute blindly)

```
terraform init
```

```
terraform plan -var bucket_name=repsignal-demo-yourname
```

```
terraform apply -var bucket_name=repsignal-demo-yourname
```

After apply you would sync the web build to the bucket:

```
npm --workspace @repsignal/web run build
```

```
aws s3 sync apps/web/dist s3://repsignal-demo-yourname
```

Tear down when finished:

```
terraform destroy -var bucket_name=repsignal-demo-yourname
```
