FROM docker.io/library/node:18-slim

# 安裝 netcat 用於檢查 MySQL 連接
RUN apt-get update && \
    apt-get install -y netcat-openbsd && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

USER node
RUN mkdir -p /home/node/app
WORKDIR /home/node/app

# 複製 package.json 和 package-lock.json
COPY --chown=node package*.json ./

# 安裝所有依賴（包括開發依賴）
RUN npm install

# 複製源碼
COPY --chown=node . .

# 執行建置
RUN npm run build

# 創建並設置啟動腳本
COPY --chown=node docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# 保留開發依賴，因為遷移時需要
# RUN npm ci --only=production

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "-r", "dotenv/config", "dist/index.js", "dotenv_config_path=/home/node/app/.env.prod"]
