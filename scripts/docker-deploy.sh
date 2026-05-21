#!/bin/bash
# Script: Build and Push Docker Images
# Usage: ./docker-deploy.sh [REGISTRY_ADDRESS] [IMAGE_TAG]
# Example: ./docker-deploy.sh localhost:5000 v1.0.0

REGISTRY=${1:-localhost:5000}
TAG=${2:-latest}

echo "========================================="
echo "🚀 Building & Pushing Images to $REGISTRY"
echo "🔖 Tag: $TAG"
echo "========================================="

echo "\n📦 [1/4] Building Strapi Image..."
docker build -t $REGISTRY/strapi-app:$TAG ./strapi

echo "\n🌐 [2/4] Building Next.js Image..."
docker build -t $REGISTRY/next-app:$TAG ./next

echo "\n📤 [3/4] Pushing Strapi Image..."
docker push $REGISTRY/strapi-app:$TAG

echo "\n📤 [4/4] Pushing Next.js Image..."
docker push $REGISTRY/next-app:$TAG

echo "\n✅ Deployment to Registry completed successfully!"
