# Frontend build stage
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Runtime stage
FROM caddy:2.9-alpine
COPY --from=frontend-builder /app/frontend/dist /usr/share/caddy
EXPOSE 8080
