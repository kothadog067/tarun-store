#!/bin/bash
# setup-gcp.sh — One-time GCP + GKE setup for Tarun's Store
# Prerequisites: gcloud CLI installed and authenticated

set -euo pipefail

# ────────────────────────────────────────────────────────────────
# Configuration — edit these!
# ────────────────────────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:-}"
CLUSTER_NAME="tarun-store-cluster"
ZONE="us-central1"
DOMAIN="${DOMAIN:-kothadog.com}"
DD_API_KEY="${DD_API_KEY:-}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "ERROR: Set GCP_PROJECT_ID env var"
  exit 1
fi

echo "======================================"
echo " Setting up Tarun's Store on GCP/GKE"
echo " Project: $PROJECT_ID"
echo " Cluster: $CLUSTER_NAME ($ZONE)"
echo " Domain: $DOMAIN"
echo "======================================"

# Set project
gcloud config set project "$PROJECT_ID"

# Enable APIs
echo "[1/9] Enabling GCP APIs..."
gcloud services enable \
  container.googleapis.com \
  containerregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --quiet

# Create GKE cluster
echo "[2/9] Creating GKE Autopilot cluster..."
gcloud container clusters create-auto "$CLUSTER_NAME" \
  --location="$ZONE" \
  --quiet || echo "Cluster may already exist, continuing..."

# Get credentials
echo "[3/9] Getting cluster credentials..."
gcloud container clusters get-credentials "$CLUSTER_NAME" \
  --location="$ZONE"

# Install nginx ingress controller
echo "[4/9] Installing nginx ingress controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.6/deploy/static/provider/cloud/deploy.yaml
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

# Install cert-manager
echo "[5/9] Installing cert-manager..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.yaml
kubectl wait --namespace cert-manager \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

# Install Datadog Operator
echo "[6/9] Installing Datadog Operator..."
helm repo add datadog https://helm.datadoghq.com
helm repo update

kubectl create namespace datadog --dry-run=client -o yaml | kubectl apply -f -

if [[ -n "$DD_API_KEY" ]]; then
  kubectl create secret generic datadog-secret \
    --from-literal=api-key="$DD_API_KEY" \
    -n datadog \
    --dry-run=client -o yaml | kubectl apply -f -

  helm upgrade --install datadog-operator datadog/datadog-operator \
    --namespace datadog \
    --set image.tag=latest \
    --quiet

  kubectl apply -f k8s/datadog/datadog-agent.yaml
else
  echo "WARNING: DD_API_KEY not set. Skipping Datadog setup."
  echo "Run: kubectl create secret generic datadog-secret --from-literal=api-key=YOUR_KEY -n datadog"
fi

# Create namespace
echo "[7/9] Creating tarun-store namespace..."
kubectl apply -f k8s/namespace.yaml

# Create secrets
echo "[8/9] Creating secrets..."
# Update postgres password in secrets.yaml (or do it manually)
kubectl apply -f k8s/infra/secrets.yaml

# Get ingress IP
echo "[9/9] Done! Getting ingress IP..."
sleep 30
INGRESS_IP=$(kubectl get svc ingress-nginx-controller \
  -n ingress-nginx \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")

echo ""
echo "======================================"
echo " GCP Setup Complete!"
echo "======================================"
echo ""
echo " Ingress IP: $INGRESS_IP"
echo ""
echo " Next steps:"
echo " 1. Point $DOMAIN → $INGRESS_IP in your DNS provider"
echo " 2. Add GitHub secrets:"
echo "    - GCP_PROJECT_ID: $PROJECT_ID"
echo "    - GCP_SA_KEY: (service account JSON)"
echo "    - DD_API_KEY: (your Datadog API key)"
echo " 3. Push to main branch to trigger deployment"
echo ""
echo " Create service account for GitHub Actions:"
echo "   gcloud iam service-accounts create github-actions --display-name='GitHub Actions'"
echo "   gcloud projects add-iam-policy-binding $PROJECT_ID \\"
echo "     --member='serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com' \\"
echo "     --role='roles/container.developer'"
echo "   gcloud projects add-iam-policy-binding $PROJECT_ID \\"
echo "     --member='serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com' \\"
echo "     --role='roles/storage.admin'"
echo "   gcloud iam service-accounts keys create key.json \\"
echo "     --iam-account='github-actions@$PROJECT_ID.iam.gserviceaccount.com'"
echo "   # Add content of key.json as GitHub secret GCP_SA_KEY"
