# msa-dev (Single-AZ)

- 목적: 단일 가용영역(AZ) 기반의 최소 네트워크(VPC+서브넷+NAT) 환경 제공
- 기본 AZ: `ap-northeast-2a` (변수 `az`로 변경 가능)

## 사용법
```powershell
cd .\msa-dev
terraform init
terraform validate
terraform plan -var=az="ap-northeast-2a"
```

## 출력
- `vpc_id`, `public_subnet_id`, `private_subnet_id`
