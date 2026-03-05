#!/bin/bash
# redeploy-local.sh — Rebuild and redeploy one or all services to local minikube
# Usage:
#   ./scripts/redeploy-local.sh              # redeploy all services
#   ./scripts/redeploy-local.sh product-service  # redeploy one service

set -euo pipefail
PROFILE="tarun-store"
NAMESPACE="tarun-store"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

ALL_SERVICES=(api-gateway product-service user-service cart-service order-service payment-service notification-service frontend)

# Target: specific service or all
TARGET="${1:-all}"

eval "$(minikube docker-env -p "$PROFILE")"

if [[ "$TARGET" == "all" ]]; then
  SERVICES=("${ALL_SERVICES[@]}")
else
  SERVICES=("$TARGET")
fi

for svc in "${SERVICES[@]}"; do
  echo "→ Rebuilding $svc..."
  docker build -t "tarun-store/$svc:local" "$ROOT_DIR/services/$svc" -q
  echo "→ Rolling restart for $svc..."
  kubectl rollout restart deployment/"$svc" -n "$NAMESPACE"
  kubectl rollout status deployment/"$svc" -n "$NAMESPACE" --timeout=120s
  echo "✓ $svc redeployed"
done

echo ""
echo "Done. Current pods:"
kubectl get pods -n "$NAMESPACE" --no-headers | awk '{printf "  %-40s %s\n", $1, $3}'
