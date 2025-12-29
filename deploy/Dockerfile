FROM node:20-alpine AS build
WORKDIR /app

COPY client/package*.json ./
RUN npm ci

COPY client/ .
# ВАЖНО: в проде лучше НЕ задавать VITE_API_BASE_URL, чтобы было "/api"
RUN npm run build

FROM caddy:2-alpine
WORKDIR /srv
COPY --from=build /app/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
