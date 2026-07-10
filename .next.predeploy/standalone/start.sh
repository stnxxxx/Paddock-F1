#!/bin/bash
set -a
. /opt/f1news/.env.production
set +a

cd /opt/f1news
mkdir -p .next/standalone/.next
[ -d .next/static ] && cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
# Create persistent upload directory (path set in .env.production)
mkdir -p "${UPLOAD_DIR:-.next/standalone/public/uploads}"
# Copy static public assets (logos, fantasy images, etc.) to standalone
[ -d public ] && cp -r public .next/standalone/ 2>/dev/null || true
exec node .next/standalone/server.js
