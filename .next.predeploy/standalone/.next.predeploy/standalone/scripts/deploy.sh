#!/bin/bash
set -e

APP_DIR="/opt/f1news"

echo "=== Deploying F1News ==="

cd ~/f1news-deploy

# Copy .env
cp .env.production "${APP_DIR}/.env.local"

# Copy built app
mkdir -p "${APP_DIR}"
rsync -a --delete \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='data' \
  --exclude='.git' \
  --exclude='.claude' \
  --exclude='design-system' \
  --exclude='docs' \
  --exclude='scripts' \
  --exclude='opencode.json' \
  . "${APP_DIR}/"

# Copy built artifacts
cp -r .next "${APP_DIR}/.next"
cp -r node_modules "${APP_DIR}/node_modules"

cd "${APP_DIR}"
npx next start -p 3000 &
disown

echo "=== Deployed ==="
sleep 2
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/