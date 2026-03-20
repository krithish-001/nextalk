# ── Stage 1: Build React app ─────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

ARG REACT_APP_API_URL=/api
ARG REACT_APP_SOCKET_URL=http://localhost:5000
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Stage 2: Serve with nginx ─────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
