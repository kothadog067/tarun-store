#!/bin/bash
# setup-local-k8s.sh — Run Tarun's Store on local Kubernetes via minikube
# Installs everything: minikube, Datadog SSI, all services, ingress
set -euo pipefail

DD_API_KEY="${DD_API_KEY:-}"
PROFILE="tarun-store"
NAMESPACE="tarun-store"
MINIKUBE_CPUS="${MINIKUBE_CPUS:-4}"
MINIKUBE_MEMORY="${MINIKUBE_MEMORY:-8192}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        Tarun's Store — Local Kubernetes Setup        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Prerequisites check ─────────────────────────────────────
info "Checking prerequisites..."

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "  ✗ $1 not found"
    return 1
  else
    echo "  ✓ $1 $(${2:-$1 --version 2>&1 | head -1})"
    return 0
  fi
}

MISSING=0
check_cmd docker          || MISSING=1
check_cmd kubectl         || MISSING=1
check_cmd helm            || MISSING=1
check_cmd minikube        || MISSING=1

if [[ $MISSING -eq 1 ]]; then
  echo ""
  warn "Missing prerequisites. Install them:"
  echo "  brew install docker kubectl helm minikube"
  echo "  (Make sure Docker Desktop is running)"
  exit 1
fi

if [[ -z "$DD_API_KEY" ]]; then
  warn "DD_API_KEY is not set. Datadog will be installed but won't send data."
  warn "Set it with: export DD_API_KEY=your_key"
  echo ""
fi

# ── Start minikube ───────────────────────────────────────────
info "Starting minikube profile '$PROFILE'..."
if minikube status -p "$PROFILE" &>/dev/null && minikube status -p "$PROFILE" | grep -q "Running"; then
  log "minikube already running"
else
  minikube start \
    --profile="$PROFILE" \
    --driver=docker \
    --cpus="$MINIKUBE_CPUS" \
    --memory="$MINIKUBE_MEMORY" \
    --disk-size=30g \
    --kubernetes-version=v1.28.0 \
    --addons=ingress,ingress-dns,metrics-server
  log "minikube started"
fi

# Point kubectl at this profile
kubectl config use-context "$PROFILE"

# Enable ingress addon (ensure it's ready)
minikube addons enable ingress -p "$PROFILE" &>/dev/null || true
minikube addons enable metrics-server -p "$PROFILE" &>/dev/null || true

# ── Build images inside minikube's Docker ───────────────────
info "Pointing Docker to minikube's daemon (so images are available in-cluster)..."
eval "$(minikube docker-env -p "$PROFILE")"

info "Building all service images..."
SERVICES=(api-gateway product-service user-service cart-service order-service payment-service notification-service frontend)

for svc in "${SERVICES[@]}"; do
  echo "  Building $svc..."
  docker build -t "tarun-store/$svc:local" "$ROOT_DIR/services/$svc" -q
  echo "  ✓ tarun-store/$svc:local"
done
log "All images built"

# ── Namespace ────────────────────────────────────────────────
info "Creating namespace..."
kubectl apply -f "$ROOT_DIR/k8s/namespace.yaml"
log "Namespace 'tarun-store' ready"

# ── Datadog ──────────────────────────────────────────────────
info "Installing Datadog Operator + Agent (SSI)..."
helm repo add datadog https://helm.datadoghq.com --force-update &>/dev/null
helm repo update &>/dev/null

kubectl create namespace datadog --dry-run=client -o yaml | kubectl apply -f - &>/dev/null

# Create the API key secret
DD_KEY="${DD_API_KEY:-placeholder-set-DD_API_KEY-env-var}"
kubectl create secret generic datadog-secret \
  --from-literal=api-key="$DD_KEY" \
  -n datadog \
  --dry-run=client -o yaml | kubectl apply -f -

# Install Datadog Operator
helm upgrade --install datadog-operator datadog/datadog-operator \
  --namespace datadog \
  --set image.tag=latest \
  --wait --timeout=120s \
  --output=table 2>/dev/null | tail -5

# Apply DatadogAgent CR (SSI config)
kubectl apply -f "$ROOT_DIR/k8s/datadog/datadog-agent.yaml" &>/dev/null || true
log "Datadog Operator installed"

# ── Infrastructure (Postgres + Redis) ───────────────────────
info "Deploying PostgreSQL and Redis..."

# Apply secrets with local values
kubectl apply -f "$ROOT_DIR/k8s/infra/secrets.yaml" &>/dev/null
kubectl apply -f "$ROOT_DIR/k8s/infra/redis.yaml"

# Generate local postgres manifest (no PVC needed for local)
kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: tarun-store
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_USER
              value: tarun
            - name: POSTGRES_PASSWORD
              value: tarunstore
            - name: POSTGRES_MULTIPLE_DATABASES
              value: "users_db,products_db,orders_db"
          volumeMounts:
            - name: init-scripts
              mountPath: /docker-entrypoint-initdb.d
      volumes:
        - name: init-scripts
          configMap:
            name: postgres-init
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: tarun-store
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-init
  namespace: tarun-store
data:
  init.sh: |
    #!/bin/bash
    set -e
    for db in users_db products_db orders_db; do
      psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -c "CREATE DATABASE $db;" 2>/dev/null || true
      psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -c "GRANT ALL PRIVILEGES ON DATABASE $db TO $POSTGRES_USER;" 2>/dev/null || true
    done
EOF

info "Waiting for Postgres and Redis..."
kubectl rollout status deployment/postgres -n "$NAMESPACE" --timeout=90s
kubectl rollout status deployment/redis -n "$NAMESPACE" --timeout=60s
log "Infrastructure ready"

# ── Deploy services (with local images) ─────────────────────
info "Deploying application services..."

for svc in api-gateway product-service user-service cart-service order-service payment-service notification-service frontend; do
  # Apply the k8s manifest but patch the image to use local build
  kubectl apply -f "$ROOT_DIR/k8s/$svc/deployment.yaml"
  kubectl set image deployment/"$svc" "$svc"="tarun-store/$svc:local" \
    -n "$NAMESPACE" &>/dev/null || true
  kubectl patch deployment "$svc" -n "$NAMESPACE" \
    --type='json' \
    -p='[{"op":"replace","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"Never"}]' \
    &>/dev/null || true
done

log "All deployments applied"

# ── Wait for services ────────────────────────────────────────
info "Waiting for all services to be ready (this may take ~2 minutes)..."
for svc in product-service user-service cart-service order-service payment-service notification-service api-gateway frontend; do
  echo -n "  Waiting for $svc..."
  kubectl rollout status deployment/"$svc" -n "$NAMESPACE" --timeout=180s &>/dev/null && echo " ✓" || echo " ✗ (check: kubectl logs deploy/$svc -n $NAMESPACE)"
done

# ── Ingress ──────────────────────────────────────────────────
info "Applying ingress..."
MINIKUBE_IP=$(minikube ip -p "$PROFILE")

# Create a local ingress (no TLS for local)
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tarun-store-ingress
  namespace: tarun-store
  annotations:
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  ingressClassName: nginx
  rules:
    - host: tarun-store.local
      http:
        paths:
          - path: /api(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: api-gateway
                port:
                  number: 8000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
EOF

log "Ingress configured"

# ── /etc/hosts ───────────────────────────────────────────────
info "Updating /etc/hosts..."
if grep -q "tarun-store.local" /etc/hosts; then
  sudo sed -i '' "s/.*tarun-store.local/$MINIKUBE_IP tarun-store.local/" /etc/hosts
else
  echo "$MINIKUBE_IP tarun-store.local" | sudo tee -a /etc/hosts >/dev/null
fi
log "/etc/hosts updated: tarun-store.local → $MINIKUBE_IP"

# ── Summary ──────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║              Tarun's Store is Running!               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Store:          http://tarun-store.local"
echo "  API Gateway:    http://tarun-store.local/api"
echo "  API Health:     http://tarun-store.local/api/health"
echo ""
echo "  Minikube IP:    $MINIKUBE_IP"
echo ""
echo "  Datadog:        $([ -n "$DD_API_KEY" ] && echo "Active — check app.datadoghq.com" || echo "No API key set — data not sent")"
echo ""
echo "  Useful commands:"
echo "  kubectl get pods -n tarun-store          # pod status"
echo "  kubectl logs deploy/product-service -n tarun-store  # logs"
echo "  minikube dashboard -p $PROFILE            # k8s dashboard"
echo "  kubectl port-forward svc/api-gateway 8000:8000 -n tarun-store  # direct API access"
echo ""
echo "  To tear down:"
echo "  minikube delete -p $PROFILE"
echo ""
