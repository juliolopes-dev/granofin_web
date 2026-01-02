# Build stage - Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copiar arquivos do frontend
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

# Build do frontend com API apontando para o mesmo servidor
ENV VITE_API_URL=/api
RUN npm run build

# Build stage - Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copiar arquivos do backend
COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./

# Gerar Prisma Client
RUN npx prisma generate --schema=prisma/schema.prisma

# Build do backend
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Instalar OpenSSL para o Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Instalar apenas dependências de produção do backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Copiar Prisma schema e gerar client
COPY backend/prisma ./prisma
RUN npx prisma generate --schema=prisma/schema.prisma

# Copiar build do backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copiar build do frontend para pasta public
COPY --from=frontend-builder /app/frontend/dist ./public

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3333

# Expor porta
EXPOSE 3333

# Comando de inicialização
CMD ["node", "dist/server.js"]
