# msa-Web

정적 웹(루트 도메인) 배포를 Terraform으로 관리합니다.

## 요구값
- domain: hhottdogg.shop
- website_bucket_name: karina-winter
- ACM(us-east-1) 인증서 ARN: arn:aws:acm:us-east-1:245040175511:certificate/270f51d3-b1a9-4347-b38d-78a1066402cc
- CloudFront 배포 ID: E2F8X4N3PSGFF4

## 실행
```powershell
terraform init
terraform plan
```

## 기존 리소스 import 예시
```powershell
# S3 버킷(존재할 경우에만)
terraform import aws_s3_bucket.website karina-winter

# ACM(us-east-1)
terraform import -provider=aws.us_east_1 aws_acm_certificate.cf arn:aws:acm:us-east-1:245040175511:certificate/270f51d3-b1a9-4347-b38d-78a1066402cc

# CloudFront 배포
terraform import aws_cloudfront_distribution.this E2F8X4N3PSGFF4

# Route53 A 레코드(루트)
terraform import aws_route53_record.root_alias Z07840551WEY8ZLTWDLBJ_hhottdogg.shop_A
```

## 참고
- import는 기존 리소스를 Terraform state로 편입시키기 위한 단계이며, 값이 정확해야 성공합니다.
- `for_each`가 apply 후에만 결정되는 리소스(ACM DNS 검증 레코드 등)는 두 단계 적용 또는 기존 인증서 import 방식으로 처리하세요.
