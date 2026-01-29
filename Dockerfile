# Etapa 1: Build del frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Etapa 2: Setup del backend + servir frontend
FROM node:18-alpine
WORKDIR /app

# Instalar dependencias del sistema para better-sqlite3
RUN apk add --no-cache python3 make g++

# Copiar y buildear backend
COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./
COPY --from=frontend-build /app/frontend/build ./public

# Crear directorio para datos
RUN mkdir -p /app/data

# Exponer puerto
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production
ENV DB_PATH=/app/data/prestamos.db

# Comando de inicio
CMD ["node", "app.js"]
