#!/usr/bin/env bash
set -euo pipefail

REGISTRY_HOST=${REGISTRY_HOST:-localhost:5000}

docker build --platform linux/amd64 -t budget-app-frontend:latest .
docker tag budget-app-frontend:latest ${REGISTRY_HOST}/budget-app-frontend:latest
docker push ${REGISTRY_HOST}/budget-app-frontend:latest
