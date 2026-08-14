FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@11.21.0

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json biome.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Install workspace dependencies and build web SPA
RUN pnpm install

WORKDIR /app/apps/web
RUN pnpm run build

# Web server stage with Nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx/ssl /etc/nginx/ssl

EXPOSE 443 80

CMD ["nginx", "-g", "daemon off;"]
