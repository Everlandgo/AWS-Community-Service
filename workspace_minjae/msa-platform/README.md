## msa-platform

운영형 아키텍처를 위한 통합 Terraform 구성입니다. VPC, EKS, 필수 애드온, API Gateway(v2) 연동, S3+CloudFront 정적 웹을 토글로 제어합니다.

### 구성 요소
- VPC: 퍼블릭/프라이빗 서브넷, NAT, VPC 엔드포인트(S3/Interface 다수)
- EKS: 1.30, 온디맨드/스팟 매니지드 노드그룹
- 애드온: AWS Load Balancer Controller, EBS CSI, ExternalDNS, ingress-nginx
- API Gateway v2: NLB(ingress)로 HTTP_PROXY 통합, VPC Link
- S3+CloudFront: 정적 웹 호스팅, OAC, Route53 A Alias

### 변수 및 토글
`variables.tf`
- `project`/`env`: 공통 태그 네임스페이스
- `domain`/`hosted_zone_id`: Route53 기준 도메인 설정
- `enable_apigw`(기본 false): API Gateway 리소스 생성 여부
- `enable_web`(기본 false): S3+CloudFront 웹 리소스 생성 여부

### 실행 가이드
사전 조건
- AWS 계정에 다음 권한이 부여된 역할을 Assume할 수 있어야 합니다: VPC/EKS/IAM/CloudFront/Route53/ACM 등
- `providers.tf`는 `profile=deploy-s3-frontend` + `assume_role=TerraformDeployerRole`로 설정되어 있습니다.

명령 예시(Windows PowerShell)
```powershell
cd .\msa-platform
..\msa-eks\terraform.exe init -input=false
..\msa-eks\terraform.exe validate
..\msa-eks\terraform.exe plan -out=tfplan
# 기본값은 enable_apigw=false, enable_web=false (네트워크+EKS+애드온만 배포)
..\msa-eks\terraform.exe apply -auto-approve tfplan

# API Gateway 활성화
..\msa-eks\terraform.exe apply -auto-approve -var=enable_apigw=true

# 정적 웹(S3+CloudFront) 활성화
..\msa-eks\terraform.exe apply -auto-approve -var=enable_web=true
```

출력
- `httpapi_invoke_url`: `enable_apigw=true`일 때 API Gateway Invoke URL(`/prod` 스테이지)

### 태그 기반 NLB 탐색(중요)
API Gateway가 Ingress NLB를 찾을 때 이름 고정이 아닌 태그로 단일 매칭을 수행합니다.
- 태그 키: `Project`, `Env`, `Component=ingress`, `Service=ingress-nginx-controller`
- `04-apigw.tf` 흐름:
  - `data.aws_resourcegroupstaggingapi_resources.ingress_nlb`로 태그 매칭 NLB ARN 목록 수집
  - `local.ingress_nlb_arn = one([...])`로 정확히 1개 NLB를 강제 단일화
  - `data.aws_lb`/`data.aws_lb_listener`로 Listener ARN을 조회하여 Integration URI로 사용
- 장점: NLB가 재생성/이름 변경되어도 태그만 일관되면 자동 추적

### Destroy 가이드(안전)
토글 리소스는 기본 비활성이라 삭제 충돌을 줄입니다.
1) 선택적으로 기능 비활성화
```powershell
..\msa-eks\terraform.exe apply -auto-approve -var=enable_web=false -var=enable_apigw=false
```
2) 전체 삭제
```powershell
..\msa-eks\terraform.exe destroy -auto-approve
```
만약 쿠버네티스 접근 불가 등으로 삭제가 막히면, 관련 리소스를 `terraform state rm`으로 상태에서 제거 후 재시도하세요.

### 진행 로그
- 1) HCL 블록 문법 정리(variables/providers/SG/CloudFront/Route53 alias 등) 완료
- 2) EKS/애드온 의존 대기(`depends_on`, `time_sleep.cluster_ready`) 추가
- 3) CloudFront `Managed-CachingOptimized` 데이터소스 조건화(`enable_web` 토글) 적용
- 4) `terraform plan` 성공: 현재 89 to add, 0 change, 0 destroy

- 5) 웹/API 구조 리파인: `service_domain=www.hhottdogg.shop`, `web_bucket_name=karina-winter` 도입, OAC/AAAA 레코드, SAN 추가
- 6) API GW `$default` 스테이지 + Lambda 헬스체크(`/api/health`) + CORS(원본: https://www.hhottdogg.shop)
- 7) Cognito 기존 User Pool(`sungjuntest`) 참조하여 JWT Authorizer 연결, 보호 라우트 `/api/me`
- 8) CloudFront에 `/api/*` 비헤이비어 추가(캐시 비활성, OriginRequestPolicy=AllViewerExceptHostHeader)
- 9) CI/CD(코드 파이프라인): CodeConnections(GitHub), CodeBuild(Docker/ECR+매니페스트 렌더), EKS Deploy 단계 추가
- 10) CodeConnections 승인 완료(콘솔), GitHub `workspace_minjae` 브랜치로 변경사항 push
- 11) 파이프라인 트리거: GitHub `jinyoung` 브랜치 커밋 시 자동 실행
- 12) 현재 적용 명령: `terraform apply -auto-approve -var=enable_web=true -var=enable_apigw=true`

- 13) CI/CD 트리거 확인: GitHub `Everlandgo/AWS-Community-Service`의 `jinyoung` 브랜치 푸시 시 CodePipeline 자동 실행(Connections 승인 완료)

- 14) Lambda `me` 함수 추가 및 `/api/me` JWT 보호 라우트 연결(Cognito User Pool 기반)
- 15) CloudFront `/api/*` 비헤이비어를 `enable_apigw`에 따라 동적 생성, 캐시 비활성 + OriginRequestPolicy=AllViewerExceptHostHeader 적용
- 16) 출력 추가: `cloudfront_distribution_id`, `web_bucket_name` 및 API/Cognito 관련 출력 정리
- 17) 배포 스크립트 추가: `scripts/web-upload.ps1`, `scripts/cf-invalidate.ps1`

### Cognito/JWT 설정값 주입
- 변수 사용: `-var=cognito_user_pool_id=ap-northeast-2_xxxxxxx -var=cognito_app_client_id=xxxxxxxx`
- 또는 `terraform.tfvars`에 아래와 같이 정의
  - `cognito_user_pool_id = "ap-northeast-2_xxxxxxx"`
  - `cognito_app_client_id = "xxxxxxxx"`

### 운영 메모(README 자동 업데이트)
- 본 프로젝트는 프롬프트 진행 시마다 본 README 하단의 진행 로그 섹션을 자동으로 갱신합니다.
- 주요 변경(인프라/CI-CD/도메인 연결/검증 결과)은 순차 항목으로 추가되며, 재현 가능한 명령과 링크를 함께 기록합니다.

### 운영 흐름 요약
1) 네트워크/EKS/애드온 → 웹(S3+CF) → API(API GW+Lambda) → 인증(Cognito) → CI/CD(CodePipeline)
2) CloudFront 기본 오리진: S3 웹. `/api/*`는 API GW 오리진으로 라우팅(캐시 비활성, 헤더/쿠키 전달)
3) API 라우트: `GET /api/health`(오픈), `GET /api/me`(JWT 필요, Cognito Authorizer)
4) GitHub `jinyoung` 브랜치 푸시 → CodePipeline 자동 실행 → CodeBuild → EKS Deploy

### 필수 입력값(사용자 제공)
- Terraform 변수(둘 중 하나 사용)
  - CLI:
    - `-var=enable_web=true -var=enable_apigw=true -var=cognito_user_pool_id="ap-northeast-2_XXXXXXXXX" -var=cognito_app_client_id="XXXXXXXXXXXXXXXXXXXX"`
  - 또는 `terraform.tfvars` 파일:
    - `enable_web = true`
    - `enable_apigw = true`
    - `cognito_user_pool_id = "ap-northeast-2_XXXXXXXXX"`
    - `cognito_app_client_id = "XXXXXXXXXXXXXXXXXXXX"`

- Route53/도메인: `hhottdogg.shop` 호스티드 존이 활성이고 `www.hhottdogg.shop`을 CloudFront에 별칭으로 연결
- GitHub: `Everlandgo/AWS-Community-Service`의 `jinyoung` 브랜치에 커밋 권한

### 유용한 출력 및 스크립트
- 출력: `website_url`, `cloudfront_domain_name`, `cloudfront_distribution_id`, `httpapi_invoke_url`
- 스크립트: `scripts/web-upload.ps1 -BuildDir <로컬빌드경로>`, `scripts/cf-invalidate.ps1`

> 참고: `terraform plan`에서 일부 출력이 `-> null`로 보일 수 있습니다. 이는 해당 기능 토글이 꺼졌거나(`enable_web=false`/`enable_apigw=false`), 혹은 리소스가 아직 생성되지 않아 의도적으로 값을 반환하지 않을 때입니다. 값이 필요하면 토글과 변수(`cognito_user_pool_id`, `cognito_app_client_id`)를 지정하고 적용 후 확인하세요.

### 검증 예시
- 웹: `Start-Process https://www.hhottdogg.shop`
- API(헬스): `curl https://www.hhottdogg.shop/api/health`
- API(보호): `curl -H "Authorization: Bearer <JWT>" https://www.hhottdogg.shop/api/me`

### 중복 리소스(import) 오류 처리
이미 존재하는 리소스로 인해 `AlreadyExistsException` 또는 `ResourceAlreadyExistsException`이 발생할 때는 Terraform state에 import 후 진행합니다.

예: KMS Alias와 CloudWatch Log Group 중복 오류
```powershell
cd .\msa-platform
# KMS Alias (기존: alias/eks/msa-forum-eks)
terraform import 'module.eks.module.kms.aws_kms_alias.this["cluster"]' 'alias/eks/msa-forum-eks'

# CloudWatch Logs Log Group (기존: /aws/eks/msa-forum-eks/cluster)
terraform import 'module.eks.aws_cloudwatch_log_group.this[0]' '/aws/eks/msa-forum-eks/cluster'

terraform plan
```
참고: 단일 AZ 샘플인 `msa-dev`는 기본적으로 `-dev` 접미사로 리소스명이 달라 동일 오류가 발생하지 않습니다. 만약 유사 오류가 있다면 해당 실제 이름으로 import 하세요.


