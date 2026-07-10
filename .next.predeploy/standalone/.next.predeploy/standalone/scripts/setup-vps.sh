#!/bin/bash
set -e

echo "=== Setting up PostgreSQL for F1News ==="

# Install Docker if not present
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# Create project directory
mkdir -p /opt/f1news

# Create docker-compose.yml for PostgreSQL
cat > /opt/f1news/docker-compose.yml << 'EOF'
services:
  postgres:
    image: postgres:16-alpine
    container_name: f1news-db
    restart: always
    environment:
      POSTGRES_DB: f1news
      POSTGRES_USER: f1news
      POSTGRES_PASSWORD: f1news_secret_2024
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U f1news"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
EOF

cd /opt/f1news
docker compose up -d

echo "=== DONE ==="
docker compose ps