#!/bin/bash

# Build and tag Docker images for Share Notes application

set -e

echo "Building Share Notes Docker images..."

# Backend
echo "Building backend image..."
docker build -t share-notes-backend:latest -f backend/Dockerfile backend/

# Frontend
echo "Building frontend image..."
docker build -t share-notes-frontend:latest --target production -f frontend/Dockerfile frontend/

echo "Images built successfully!"
echo ""
echo "To push to a registry:"
echo "  docker tag share-notes-backend:latest <your-registry>/share-notes-backend:latest"
echo "  docker tag share-notes-frontend:latest <your-registry>/share-notes-frontend:latest"
echo "  docker push <your-registry>/share-notes-backend:latest"
echo "  docker push <your-registry>/share-notes-frontend:latest"
