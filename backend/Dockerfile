FROM node:22-alpine AS base
WORKDIR /app

# 安裝依賴
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 複製原始碼
COPY tsconfig.json ./
COPY src ./src

# 健康檢查
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3001}/health || exit 1

EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
