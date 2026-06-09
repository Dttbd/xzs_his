FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/admin/package.json ./packages/admin/
COPY packages/portal/package.json ./packages/portal/
RUN pnpm install --frozen-lockfile
COPY . .
# Build shared TypeScript declarations first (admin + portal reference it via tsc project refs).
# Clean any stale local build-info to ensure a fresh build in the container.
RUN rm -f packages/shared/tsconfig.tsbuildinfo && \
    cd packages/shared && npx tsc --build --force
# Build apps using vite build directly (type errors are caught in CI; skip tsc here for speed).
RUN cd packages/admin && npx vite build
RUN cd packages/portal && npx vite build

FROM nginx:alpine
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/admin/dist /usr/share/nginx/html/admin
COPY --from=builder /app/packages/portal/dist /usr/share/nginx/html/portal
EXPOSE 80 443
