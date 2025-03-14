#!/bin/sh
set -e

# 等待 MySQL 準備就緒
echo "Waiting for MySQL to be ready..."
while ! nc -z ${DB_HOST:-db} ${DB_PORT:-3306}; do
  sleep 1
done
echo "MySQL is ready!"

# 執行資料庫遷移
echo "Running database migrations..."
npm run migrate

# 執行主應用程序
echo "Starting application..."
exec "$@"
