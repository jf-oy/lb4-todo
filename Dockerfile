FROM docker.io/library/node:18-slim

USER node
RUN mkdir -p /home/node/app
WORKDIR /home/node/app

COPY --chown=node package*.json ./
RUN npm install --production

COPY --chown=node . .
RUN npm run build

ENV HOST=0.0.0.0 PORT=3000
EXPOSE ${PORT}
CMD ["node", "-r", "dotenv/config", "dist/index.js", "dotenv_config_path=/home/node/app/.env.prod"]
