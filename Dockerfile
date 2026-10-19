# Builds the app and serves it as static files; there is no backend.
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Optional: the address this copy is served from, for the canonical link and
# og:url (docker build --build-arg SITE_URL=https://example.com .)
ARG SITE_URL=""
ENV SITE_URL=$SITE_URL
# Optional: the Google project that Drive sync goes through (see README). None
# is a secret; they end up in the built page.
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_GOOGLE_API_KEY=""
ARG VITE_GOOGLE_APP_ID=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID VITE_GOOGLE_API_KEY=$VITE_GOOGLE_API_KEY VITE_GOOGLE_APP_ID=$VITE_GOOGLE_APP_ID
RUN pnpm build
# nginx's copy of the security headers, made from the list for every path
# ("/*") in public/_headers (Cloudflare's format), so there's one list to keep.
# Fails the build if the policy didn't come through.
RUN awk '/^[ \t]*(#|$)/ { next } \
  /^[^ \t]/ { all = ($1 == "/*"); next } \
  all { sub(/^[ \t]+/, ""); i = index($0, ":"); printf "add_header %s \"%s\" always;\n", substr($0, 1, i - 1), substr($0, i + 2) }' \
  dist/_headers > security-headers.conf \
  && grep -q '^add_header Content-Security-Policy ' security-headers.conf

# nginx's own image that runs as an ordinary user, not root, so a hole in
# nginx can't take over the container. Such a user can't use ports below
# 1024, hence 8080.
FROM nginxinc/nginx-unprivileged:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
