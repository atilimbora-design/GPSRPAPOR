FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# SQLite için klasör oluştur (Eğer yoksa)
RUN mkdir -p /app/peronel

EXPOSE 3000

CMD ["node", "server.js"]
