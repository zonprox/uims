# Build stage
FROM node:24-alpine AS build

WORKDIR /app

# Copy workspace config (assuming mono-repo context if needed, otherwise just copy web)
# Adjust these copies based on actual context if running from root
COPY package.json .
COPY apps/web/package.json apps/web/
# etc. Or simply for standalone:

COPY package.json yarn.lock* pnpm-lock.yaml* package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
