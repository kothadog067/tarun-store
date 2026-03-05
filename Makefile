.PHONY: help local local-setup local-redeploy local-logs local-status local-teardown \
        compose compose-down prod-setup prod-deploy

PROFILE   := tarun-store
NAMESPACE := tarun-store
SERVICE   ?= all

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ── Local Kubernetes ─────────────────────────────────────────
local: local-setup ## Set up and run on local Kubernetes (minikube)

local-setup: ## Start minikube, build images, deploy everything
	@chmod +x scripts/setup-local-k8s.sh && ./scripts/setup-local-k8s.sh

local-redeploy: ## Rebuild and redeploy a service (make local-redeploy SERVICE=product-service)
	@chmod +x scripts/redeploy-local.sh && ./scripts/redeploy-local.sh $(SERVICE)

local-logs: ## Tail logs from a service (make local-logs SERVICE=api-gateway)
	kubectl logs -f deploy/$(SERVICE) -n $(NAMESPACE)

local-status: ## Show pod status and ingress
	@echo "\n=== Pods ==="
	@kubectl get pods -n $(NAMESPACE)
	@echo "\n=== Services ==="
	@kubectl get svc -n $(NAMESPACE)
	@echo "\n=== Ingress ==="
	@kubectl get ingress -n $(NAMESPACE)
	@echo "\n=== Minikube IP ==="
	@minikube ip -p $(PROFILE)

local-dashboard: ## Open minikube Kubernetes dashboard
	minikube dashboard -p $(PROFILE)

local-teardown: ## Tear down the local minikube cluster
	minikube delete -p $(PROFILE)

local-tunnel: ## Start minikube tunnel (needed if using LoadBalancer type)
	minikube tunnel -p $(PROFILE)

local-shell: ## Shell into a running service pod (make local-shell SERVICE=product-service)
	kubectl exec -it deploy/$(SERVICE) -n $(NAMESPACE) -- /bin/sh

local-dd-logs: ## Tail Datadog agent logs
	kubectl logs -f -n datadog -l app.kubernetes.io/name=datadog -c agent

# ── Docker Compose (quick local dev, no k8s) ────────────────
compose: ## Start with Docker Compose (simpler, no Kubernetes)
	docker compose up --build

compose-down: ## Stop Docker Compose
	docker compose down -v

# ── Production (GCP GKE) ─────────────────────────────────────
prod-setup: ## Set up GCP/GKE cluster (run once)
	@chmod +x scripts/setup-gcp.sh && ./scripts/setup-gcp.sh

prod-deploy: ## Deploy to GKE (normally done via GitHub Actions on push to main)
	git push origin main
