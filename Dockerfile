FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock .yarnrc ./
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
RUN corepack enable && \
    yarn config set registry https://registry.npmmirror.com && \
    yarn install --ignore-engines

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 构建时使用 .env.local（如果存在）
COPY .env.local* ./
RUN yarn build

FROM node:20-alpine AS runner
WORKDIR /app

# 安装基础依赖（PDF 使用 @react-pdf/renderer 客户端生成，无需 Chromium）
RUN apk add --no-cache ca-certificates

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 设置环境变量
ENV NODE_ENV=production \
    PORT=3333 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# standalone 模式只需要这些文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

EXPOSE 3333

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3333/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
