FROM node:18-alpine

WORKDIR /app

# Coolify Repo Root Context olduğu için path'leri backend/ olarak güncelliyoruz
COPY backend/package*.json ./

RUN npm install

COPY backend/ .

# Veri klasörü oluştur
RUN mkdir -p /app/personel

EXPOSE 3000

CMD ["node", "server.js"]
