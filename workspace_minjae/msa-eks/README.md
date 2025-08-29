# 🚀 MSA EKS 인프라 단계별 배포 가이드

이 프로젝트는 AWS EKS를 사용한 MSA(Microservices Architecture) 인프라를 단계별로 배포할 수 있도록 구성되어 있습니다.

## 📋 사전 요구사항

### 1. AWS 계정 및 권한
- AWS 계정이 필요합니다
- `deploy-s3-frontend` 사용자에게 다음 권한이 필요합니다:
  - `iam:CreatePolicy`, `iam:CreateRole`
  - `ec2:*`, `eks:*`, `apigateway:*`
  - `logs:*`, `elasticloadbalancing:*`, `autoscaling:*`

### 2. 로컬 환경
- Terraform >= 1.7.0
- AWS CLI 구성
- kubectl (EKS 클러스터 생성 후)
- Helm (EKS 클러스터 생성 후)

## 🏗️ 아키텍처 개요

```
Internet
    ↓
API Gateway
    ↓
VPC Link
    ↓
Ingress NLB (Private)
    ↓
EKS Cluster
    ↓
Sample Application
```

## 📁 파일 구조

```
msa-eks/
├── 01-network.tf          # 1단계: VPC, 서브넷, VPC 엔드포인트
├── 02-eks-cluster.tf      # 2단계: EKS 클러스터 및 노드 그룹
├── 03-iam-policies.tf     # 3단계: IAM 정책 및 역할
├── 04-k8s-addons.tf       # 4단계: Kubernetes 애드온
├── 05-api-gateway.tf      # 5단계: API Gateway
├── 06-sample-app.tf       # 6단계: 샘플 애플리케이션
├── deploy-steps.ps1       # PowerShell 배포 스크립트
├── 1.providers.tf         # Terraform 프로바이더 설정
├── 2.variables.tf         # 변수 정의
└── README.md              # 이 파일
```

## 🚀 배포 방법

### 방법 1: PowerShell 스크립트 사용 (권장)

#### 전체 배포
```powershell
.\deploy-steps.ps1 -Step all
```

#### 단계별 배포
```powershell
# 1단계: 네트워크 인프라
.\deploy-steps.ps1 -Step 1

# 2단계: EKS 클러스터
.\deploy-steps.ps1 -Step 2

# 3단계: IAM 정책
.\deploy-steps.ps1 -Step 3

# 4단계: Kubernetes 애드온
.\deploy-steps.ps1 -Step 4

# 5단계: API Gateway
.\deploy-steps.ps1 -Step 5

# 6단계: 샘플 애플리케이션
.\deploy-steps.ps1 -Step 6
```

#### 리소스 삭제
```powershell
.\deploy-steps.ps1 -Destroy
```

### 방법 2: 수동 Terraform 명령어

#### 1단계: 네트워크 인프라
```bash
terraform init
terraform plan -target=module.vpc -target=aws_security_group.vpce_sg -target=aws_vpc_endpoint.interface -target=aws_vpc_endpoint.s3
terraform apply -target=module.vpc -target=aws_security_group.vpce_sg -target=aws_vpc_endpoint.interface -target=aws_vpc_endpoint.s3
```

#### 2단계: EKS 클러스터
```bash
terraform plan -target=module.eks
terraform apply -target=module.eks
```

#### 3단계: IAM 정책
```bash
terraform plan -target=aws_iam_policy.eks_minimal_access -target=aws_iam_policy.eks_readonly
terraform apply -target=aws_iam_policy.eks_minimal_access -target=aws_iam_policy.eks_readonly
```

#### 4단계: Kubernetes 애드온
```bash
terraform plan -target=module.iam_irsa_alb -target=helm_release.alb -target=helm_release.ebs -target=helm_release.extdns -target=helm_release.ingress -target=helm_release.metrics -target=helm_release.cluster_autoscaler -target=helm_release.node_termination_handler
terraform apply -target=module.iam_irsa_alb -target=helm_release.alb -target=helm_release.ebs -target=helm_release.extdns -target=helm_release.ingress -target=helm_release.metrics -target=helm_release.cluster_autoscaler -target=helm_release.node_termination_handler
```

#### 5단계: API Gateway
```bash
terraform plan -target=aws_security_group.apigw_sg -target=aws_apigatewayv2_vpc_link.vpclink -target=aws_apigatewayv2_api.httpapi -target=aws_apigatewayv2_integration.nlb_proxy -target=aws_apigatewayv2_route.v1_proxy -target=aws_apigatewayv2_stage.prod
terraform apply -target=aws_security_group.apigw_sg -target=aws_apigatewayv2_vpc_link.vpclink -target=aws_apigatewayv2_api.httpapi -target=aws_apigatewayv2_integration.nlb_proxy -target=aws_apigatewayv2_route.v1_proxy -target=aws_apigatewayv2_stage.prod
```

#### 6단계: 샘플 애플리케이션
```bash
terraform plan -target=kubernetes_namespace.sample_app -target=kubernetes_deployment.sample_app -target=kubernetes_service.sample_app -target=kubernetes_ingress_v1.sample_app -target=kubernetes_horizontal_pod_autoscaler_v2.sample_app
terraform apply -target=kubernetes_namespace.sample_app -target=kubernetes_deployment.sample_app -target=kubernetes_service.sample_app -target=kubernetes_ingress_v1.sample_app -target=kubernetes_horizontal_pod_autoscaler_v2.sample_app
```

## 🔧 구성 요소

### 1단계: 네트워크 인프라
- **VPC**: 10.0.0.0/16 CIDR
- **퍼블릭 서브넷**: 10.0.0.0/24, 10.0.1.0/24
- **프라이빗 서브넷**: 10.0.10.0/24, 10.0.11.0/24
- **NAT Gateway**: 각 AZ별로 구성
- **VPC 엔드포인트**: ECR, CloudWatch, STS, Secrets Manager 등

### 2단계: EKS 클러스터
- **클러스터 버전**: Kubernetes 1.30
- **노드 그룹**:
  - `base_od`: ARM64, t4g.medium, ON_DEMAND (2-4개)
  - `burst_spot`: ARM64, c7g.large/m7g.large, SPOT (0-10개)
  - `fallback_x86_spot`: x86_64, t3a.medium/m6a.large, SPOT (0-4개)

### 3단계: IAM 정책
- **EKS 최소 접근 정책**: 기본 EKS 접근 권한
- **EKS 읽기 전용 정책**: 모니터링 및 조회 권한

### 4단계: Kubernetes 애드온
- **AWS Load Balancer Controller**: ALB/NLB 관리
- **AWS EBS CSI Driver**: EBS 볼륨 관리
- **External DNS**: Route53 자동 DNS 관리
- **Ingress Nginx**: 인그레스 컨트롤러
- **Metrics Server**: 리소스 메트릭 수집
- **Cluster Autoscaler**: 노드 자동 확장
- **AWS Node Termination Handler**: 스팟 인스턴스 안전 종료

### 5단계: API Gateway
- **HTTP API**: RESTful API 엔드포인트
- **VPC Link**: 프라이빗 서브넷 연결
- **프록시 라우팅**: /v1/* 경로로 모든 요청 전달

### 6단계: 샘플 애플리케이션
- **Nginx 기반**: 간단한 웹 서버
- **HPA**: CPU/메모리 기반 자동 확장
- **Ingress**: 외부 접근 및 로드 밸런싱

## 📊 모니터링 및 접근

### EKS 클러스터 접근
```bash
aws eks update-kubeconfig --region ap-northeast-2 --name msa-forum-eks
kubectl get nodes
kubectl get pods --all-namespaces
```

### 애플리케이션 접근
- **외부 도메인**: `api.hhottdogg.shop`
- **API Gateway**: `https://{api-id}.execute-api.ap-northeast-2.amazonaws.com/prod`

## 📝 진행 이력 (운영 메모)

- 2025-08-29
  - EKS 애드온 데이터소스 복구: `aws_eks_cluster`, `aws_eks_cluster_auth` 주석 해제 및 `depends_on = [module.eks]` 추가
  - EKS Endpoint CIDR 오류 수정: `cluster_endpoint_public_access_cidrs`를 `106.248.40.226/32`로 설정(임시로 0.0.0.0/0 오픈 후 재축소)
  - 애드온 순서 보장: `time_sleep.cluster_ready`(120s) 및 `time_sleep.alb_ready`(60s) 추가로 웹훅 준비 대기
  - ExternalDNS 정책 ARN 형식 수정: `arn:aws:route53:::hostedzone/...`
  - Ingress-NGINX 배포 재시도: ALB 컨트롤러 준비 대기 후 성공적으로 배포 완료
  - API Gateway 토글 추가: `var.enable_apigw` (기본 false) 도입, Ingress NLB 리스너 ARN 자동 조회로 연계
  - Ingress Service에 NLB 태그 추가: `service.beta.kubernetes.io/aws-load-balancer-additional-resource-tags = kubernetes.io/service-name=ingress-nginx/ingress-nginx-controller`
  - API Gateway LB 탐색 안정화: `data "aws_lb"`에 `vpc_id`, `load_balancer_type = "network"` 추가 및 리스너 포트 80 사용

### API Gateway 활성화 방법

1) 변수 활성화
```bash
terraform apply -var=enable_apigw=true
```

2) 출력값 확인
```bash
terraform output httpapi_invoke_url
terraform output api_id
```

3) 문제 시 확인 사항
- Ingress NLB가 생성되었는지 및 태그 `kubernetes.io/service-name=ingress-nginx/ingress-nginx-controller`가 부여되었는지 확인
- `aws_apigatewayv2_integration`가 참조하는 리스너 ARN이 존재하는지 확인(포트 80)

## 🚨 주의사항

1. **권한 문제**: 배포 전에 AWS 사용자에게 필요한 권한이 부여되었는지 확인
2. **순서 준수**: 단계별 배포 시 순서를 반드시 지켜야 함
3. **비용**: EKS 클러스터와 NAT Gateway는 지속적인 비용 발생
4. **도메인**: Route53 호스팅 영역이 미리 구성되어 있어야 함

## 🔍 문제 해결

### 일반적인 오류
1. **권한 부족**: IAM 정책 확인 및 수정
2. **VPC 제한**: VPC 제한 확인
3. **서브넷 충돌**: CIDR 블록 중복 확인

### 로그 확인
```bash
# EKS 클러스터 로그
aws logs describe-log-groups --log-group-name-prefix "/aws/eks/msa-forum-eks"

# Pod 로그
kubectl logs -n kube-system deployment/aws-load-balancer-controller
```

## 📞 지원

문제가 발생하거나 추가 도움이 필요한 경우:
1. Terraform 상태 확인: `terraform show`
2. 계획 재검토: `terraform plan`
3. 로그 분석 및 오류 메시지 확인

---

**⚠️ 중요**: 프로덕션 환경에 배포하기 전에 테스트 환경에서 충분히 검증하세요.
