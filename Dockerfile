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

FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
