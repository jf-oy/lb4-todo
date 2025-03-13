FROM mcr.microsoft.com/devcontainers/typescript-node:1-18-bookworm

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    git curl vim zsh \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" --unattended || true

WORKDIR /workspaces/todo-loopback

RUN npm install -g @loopback/cli@6.2.1

COPY package*.json ./
COPY .env.dev ./
RUN npm install

# COPY . .
# RUN npm run build

ENV SHELL=/bin/zsh
EXPOSE 3000
