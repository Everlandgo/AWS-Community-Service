# =============================================================================
# 6단계: 샘플 애플리케이션 배포
# =============================================================================

# 샘플 애플리케이션 네임스페이스
resource "kubernetes_namespace" "sample_app" {
  metadata {
    name = "sample-app"
    labels = {
      app = "sample-app"
    }
  }
}

# 샘플 애플리케이션 디플로이먼트
resource "kubernetes_deployment" "sample_app" {
  metadata {
    name      = "sample-app"
    namespace = kubernetes_namespace.sample_app.metadata[0].name
    labels = {
      app = "sample-app"
    }
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "sample-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "sample-app"
        }
      }

      spec {
        container {
          image = "nginx:alpine"
          name  = "sample-app"

          port {
            container_port = 80
          }

          resources {
            limits = {
              cpu    = "0.5"
              memory = "512Mi"
            }
            requests = {
              cpu    = "250m"
              memory = "50Mi"
            }
          }
        }
      }
    }
  }
}

# 샘플 애플리케이션 서비스
resource "kubernetes_service" "sample_app" {
  metadata {
    name      = "sample-app"
    namespace = kubernetes_namespace.sample_app.metadata[0].name
    labels = {
      app = "sample-app"
    }
  }

  spec {
    selector = {
      app = "sample-app"
    }

    port {
      port        = 80
      target_port = 80
    }

    type = "ClusterIP"
  }
}

# 샘플 애플리케이션 Ingress
resource "kubernetes_ingress_v1" "sample_app" {
  metadata {
    name      = "sample-app"
    namespace = kubernetes_namespace.sample_app.metadata[0].name
    labels = {
      app = "sample-app"
    }
    annotations = {
      "kubernetes.io/ingress.class"                = "nginx"
      "nginx.ingress.kubernetes.io/rewrite-target" = "/"
      "external-dns.alpha.kubernetes.io/hostname"  = "api.${var.domain}"
      "external-dns.alpha.kubernetes.io/ttl"       = "300"
    }
  }

  spec {
    rule {
      host = "api.${var.domain}"
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.sample_app.metadata[0].name
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }
}

# HPA (Horizontal Pod Autoscaler)
resource "kubernetes_horizontal_pod_autoscaler_v2" "sample_app" {
  metadata {
    name      = "sample-app"
    namespace = kubernetes_namespace.sample_app.metadata[0].name
    labels = {
      app = "sample-app"
    }
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.sample_app.metadata[0].name
    }

    min_replicas = 2
    max_replicas = 10

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }

    metric {
      type = "Resource"
      resource {
        name = "memory"
        target {
          type                = "Utilization"
          average_utilization = 80
        }
      }
    }
  }
}
