# Production multi-stage build:
# İlk stage'de TypeScript backend Node.js ile build edilerek JavaScript'e çevrilir.
# İkinci stage'de yalnızca build çıktısı ve production dependency'leri kullanılır.
# Development araçları ve TypeScript source code final image'a taşınmaz.
# Backend, build edilmiş dist/src/index.js dosyası Node.js ile çalıştırılarak başlatılır.

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

EXPOSE 4000

CMD ["node", "dist/src/index.js"]