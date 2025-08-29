# =============================================================================
# MSA EKS 단계별 배포 스크립트 (PowerShell)
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("1", "2", "3", "4", "5", "6", "all")]
    [string]$Step = "all",
    
    [Parameter(Mandatory=$false)]
    [switch]$Destroy
)

Write-Host "🚀 MSA EKS 단계별 배포 스크립트 시작" -ForegroundColor Green
Write-Host "현재 단계: $Step" -ForegroundColor Yellow

# Terraform 초기화
function Initialize-Terraform {
    Write-Host "📦 Terraform 초기화 중..." -ForegroundColor Blue
    terraform init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Terraform 초기화 실패" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Terraform 초기화 완료" -ForegroundColor Green
}

# 1단계: 네트워크 인프라
function Deploy-Network {
    Write-Host "🌐 1단계: 네트워크 인프라 배포 중..." -ForegroundColor Blue
    
    # 기존 파일들 제거 (1단계만 실행할 경우)
    if ($Step -eq "1") {
        Remove-Item -Path "02-eks-cluster.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "03-iam-policies.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "04-k8s-addons.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "05-api-gateway.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "06-sample-app.tf" -ErrorAction SilentlyContinue
    }
    
    terraform plan -target=module.vpc -target=aws_security_group.vpce_sg -target=aws_vpc_endpoint.interface -target=aws_vpc_endpoint.s3
    if ($LASTEXITCODE -eq 0) {
        terraform apply -target=module.vpc -target=aws_security_group.vpce_sg -target=aws_vpc_endpoint.interface -target=aws_vpc_endpoint.s3 -auto-approve
    }
    
    Write-Host "✅ 1단계: 네트워크 인프라 배포 완료" -ForegroundColor Green
}

# 2단계: EKS 클러스터
function Deploy-EKS {
    Write-Host "☸️ 2단계: EKS 클러스터 배포 중..." -ForegroundColor Blue
    
    if ($Step -eq "2") {
        Remove-Item -Path "01-network.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "03-iam-policies.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "04-k8s-addons.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "05-api-gateway.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "06-sample-app.tf" -ErrorAction SilentlyContinue
    }
    
    terraform plan -target=module.eks
    if ($LASTEXITCODE -eq 0) {
        terraform apply -target=module.eks -auto-approve
    }
    
    Write-Host "✅ 2단계: EKS 클러스터 배포 완료" -ForegroundColor Green
}

# 3단계: IAM 정책
function Deploy-IAM {
    Write-Host "🔐 3단계: IAM 정책 배포 중..." -ForegroundColor Blue
    
    if ($Step -eq "3") {
        Remove-Item -Path "01-network.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "02-eks-cluster.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "04-k8s-addons.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "05-api-gateway.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "06-sample-app.tf" -ErrorAction SilentlyContinue
    }
    
    terraform plan -target=aws_iam_policy.eks_minimal_access -target=aws_iam_policy.eks_readonly
    if ($LASTEXITCODE -eq 0) {
        terraform apply -target=aws_iam_policy.eks_minimal_access -target=aws_iam_policy.eks_readonly -auto-approve
    }
    
    Write-Host "✅ 3단계: IAM 정책 배포 완료" -ForegroundColor Green
}

# 4단계: Kubernetes 애드온
function Deploy-Addons {
    Write-Host "🔧 4단계: Kubernetes 애드온 배포 중..." -ForegroundColor Blue
    
    if ($Step -eq "4") {
        Remove-Item -Path "01-network.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "02-eks-cluster.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "03-iam-policies.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "05-api-gateway.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "06-sample-app.tf" -ErrorAction SilentlyContinue
    }
    
    # EKS 클러스터가 준비될 때까지 대기
    Write-Host "⏳ EKS 클러스터 준비 대기 중..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    terraform plan -target=module.iam_irsa_alb -target=module.iam_irsa_ebs -target=module.iam_irsa_extdns -target=helm_release.alb -target=helm_release.ebs -target=helm_release.extdns -target=helm_release.ingress -target=helm_release.metrics -target=helm_release.cluster_autoscaler -target=helm_release.node_termination_handler
    if ($LASTEXITCODE -eq 0) {
        terraform apply -target=module.iam_irsa_alb -target=module.iam_irsa_ebs -target=module.iam_irsa_extdns -target=helm_release.alb -target=helm_release.ebs -target=helm_release.extdns -target=helm_release.ingress -target=helm_release.metrics -target=helm_release.cluster_autoscaler -target=helm_release.node_termination_handler -auto-approve
    }
    
    Write-Host "✅ 4단계: Kubernetes 애드온 배포 완료" -ForegroundColor Green
}

# 5단계: API Gateway
function Deploy-APIGateway {
    Write-Host "🌐 5단계: API Gateway 배포 중..." -ForegroundColor Blue
    
    if ($Step -eq "5") {
        Remove-Item -Path "01-network.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "02-eks-cluster.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "03-iam-policies.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "04-k8s-addons.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "06-sample-app.tf" -ErrorAction SilentlyContinue
    }
    
    terraform plan -target=aws_security_group.apigw_sg -target=aws_apigatewayv2_vpc_link.vpclink -target=aws_apigatewayv2_api.httpapi -target=aws_apigatewayv2_integration.nlb_proxy -target=aws_apigatewayv2_route.v1_proxy -target=aws_apigatewayv2_stage.prod
    if ($LASTEXITCODE -eq 0) {
        terraform apply -target=aws_security_group.apigw_sg -target=aws_apigatewayv2_vpc_link.vpclink -target=aws_apigatewayv2_api.httpapi -target=aws_apigatewayv2_integration.nlb_proxy -target=aws_apigatewayv2_route.v1_proxy -target=aws_apigatewayv2_stage.prod -auto-approve
    }
    
    Write-Host "✅ 5단계: API Gateway 배포 완료" -ForegroundColor Green
}

# 6단계: 샘플 애플리케이션
function Deploy-SampleApp {
    Write-Host "📱 6단계: 샘플 애플리케이션 배포 중..." -ForegroundColor Blue
    
    if ($Step -eq "6") {
        Remove-Item -Path "01-network.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "02-eks-cluster.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "03-iam-policies.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "04-k8s-addons.tf" -ErrorAction SilentlyContinue
        Remove-Item -Path "05-api-gateway.tf" -ErrorAction SilentlyContinue
    }
    
    terraform plan -target=kubernetes_namespace.sample_app -target=kubernetes_deployment.sample_app -target=kubernetes_service.sample_app -target=kubernetes_ingress_v1.sample_app -target=kubernetes_horizontal_pod_autoscaler_v2.sample_app
    if ($LASTEXITCODE -eq 0) {
        terraform apply -target=kubernetes_namespace.sample_app -target=kubernetes_deployment.sample_app -target=kubernetes_service.sample_app -target=kubernetes_ingress_v1.sample_app -target=kubernetes_horizontal_pod_autoscaler_v2.sample_app -auto-approve
    }
    
    Write-Host "✅ 6단계: 샘플 애플리케이션 배포 완료" -ForegroundColor Green
}

# 전체 배포
function Deploy-All {
    Write-Host "🚀 전체 배포 시작..." -ForegroundColor Green
    Deploy-Network
    Deploy-EKS
    Deploy-IAM
    Deploy-Addons
    Deploy-APIGateway
    Deploy-SampleApp
    Write-Host "🎉 전체 배포 완료!" -ForegroundColor Green
}

# 리소스 삭제
function Destroy-Resources {
    Write-Host "🗑️ 리소스 삭제 중..." -ForegroundColor Red
    terraform destroy -auto-approve
    Write-Host "✅ 리소스 삭제 완료" -ForegroundColor Green
}

# 메인 실행 로직
try {
    Initialize-Terraform
    
    if ($Destroy) {
        Destroy-Resources
    } else {
        switch ($Step) {
            "1" { Deploy-Network }
            "2" { Deploy-EKS }
            "3" { Deploy-IAM }
            "4" { Deploy-Addons }
            "5" { Deploy-APIGateway }
            "6" { Deploy-SampleApp }
            "all" { Deploy-All }
        }
    }
    
    Write-Host "✅ 작업 완료!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ 오류 발생: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
