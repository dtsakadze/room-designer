# Builds the app and serves it as static files; there is no backend.
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Optional: the address this copy is served from, for the canonical link and
# sitemap (docker build --build-arg SITE_URL=https://example.com .)
ARG SITE_URL=""
ENV SITE_URL=$SITE_URL
RUN pnpm build

# nginx's own image that runs as an ordinary user, not root, so a hole in
# nginx can't take over the container. Such a user can't use ports below
# 1024, hence 8080.
FROM nginxinc/nginx-unprivileged:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
