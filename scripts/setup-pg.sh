#!/bin/bash
set -e

# Create user and database
su - postgres -c "psql -c \"CREATE USER f1news WITH PASSWORD 'f1news_secret_2024' CREATEDB;\""
su - postgres -c "createdb f1news -O f1news"

# Allow remote connections for app
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/16/main/postgresql.conf
echo "host all all 0.0.0.0/0 md5" >> /etc/postgresql/16/main/pg_hba.conf

systemctl restart postgresql
sleep 2

# Verify
PGPASSWORD=f1news_secret_2024 psql -h 127.0.0.1 -U f1news -d f1news -c "SELECT 'PostgreSQL ready!' as status"