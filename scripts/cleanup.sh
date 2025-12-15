#!/bin/bash

# Clean up Share Notes deployment from Kubernetes

set -e

echo "Cleaning up Share Notes from Kubernetes..."

kubectl delete -f infrastructure/k8s/ --ignore-not-found=true

echo "Cleanup complete!"
