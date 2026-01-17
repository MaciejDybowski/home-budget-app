#!/usr/bin/env bash
set -euo pipefail

# Użyj zmiennej REGISTRY_HOST (np. registry.local:5000). Fallback to localhost for easier setup.
REGISTRY_HOST=${REGISTRY_HOST:-localhost:5000}

docker build --platform linux/amd64 -t budget-app-backend:latest .
docker tag budget-app-backend:latest ${REGISTRY_HOST}/budget-app-backend:latest
docker push ${REGISTRY_HOST}/budget-app-backend:latest
