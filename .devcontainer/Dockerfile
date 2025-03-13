FROM mcr.microsoft.com/devcontainers/typescript-node:1-18-bookworm

# 安裝額外的工具（包含 zsh）
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    git \
    curl \
    vim \
    zsh \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# 安裝 oh-my-zsh
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" --unattended || true

# 設置工作目錄
WORKDIR /workspaces/todo-loopback

# 安裝 loopback cli
RUN npm install -g @loopback/cli@6.2.1
# typescript

# 設置默認 shell 為 zsh
ENV SHELL=/bin/zsh 

# 暴露端口
EXPOSE 3000