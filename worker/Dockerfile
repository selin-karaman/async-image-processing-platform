# Production multi-stage build:
# İlk stage'de TypeScript worker Node.js ile build edilerek JavaScript'e çevrilir.
# İkinci stage'de yalnızca build çıktısı ve production dependency'leri kullanılır.
# Development araçları ve TypeScript source code final image'a taşınmaz.
# Worker, build edilmiş JavaScript'i Node.js ile çalıştırarak RabbitMQ kuyruğunu dinler.

# ==============================
# Stage 1: Build
# ==============================
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


# ==============================
# Stage 2: Production
# ==============================
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/src/index.js"]