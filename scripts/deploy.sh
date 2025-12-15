#!/bin/bash

# Deploy Share Notes to Kubernetes

set -e

echo "Deploying Share Notes to Kubernetes..."

# Create namespace
echo "Creating namespace..."
kubectl apply -f infrastructure/k8s/00-namespace.yaml

# Deploy databases
echo "Deploying databases..."
kubectl apply -f infrastructure/k8s/01-postgres.yaml
kubectl apply -f infrastructure/k8s/02-mongodb.yaml
kubectl apply -f infrastructure/k8s/03-redis.yaml

# Wait for databases to be ready
echo "Waiting for databases to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n share-notes --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongodb -n share-notes --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n share-notes --timeout=300s

# Deploy Keycloak
echo "Deploying Keycloak..."
kubectl apply -f infrastructure/k8s/04-keycloak.yaml

# Wait for Keycloak to be ready
echo "Waiting for Keycloak to be ready..."
kubectl wait --for=condition=ready pod -l app=keycloak -n share-notes --timeout=600s

# Deploy backend and frontend
echo "Deploying backend and frontend..."
kubectl apply -f infrastructure/k8s/05-backend.yaml
kubectl apply -f infrastructure/k8s/06-frontend.yaml

# Deploy ingress
echo "Deploying ingress..."
kubectl apply -f infrastructure/k8s/07-ingress.yaml

echo ""
echo "Deployment complete!"
echo ""
echo "Check the status with:"
echo "  kubectl get pods -n share-notes"
echo ""
echo "Get the ingress address with:"
echo "  kubectl get ingress -n share-notes"
