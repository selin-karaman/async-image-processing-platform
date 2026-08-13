# Production multi-stage build:
# İlk stage'de Angular uygulaması Node.js ile build edilir.
# İkinci stage'de yalnızca oluşan statik dosyalar Nginx image'ına alınır.
# Böylece Node.js, source code ve build dependency'leri final image'a taşınmaz.
# Nginx yalnızca hazır HTML/CSS/JS dosyalarını kullanıcıya sunar.

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
FROM nginx:alpine

COPY --from=builder /app/dist/frontend-starter /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]