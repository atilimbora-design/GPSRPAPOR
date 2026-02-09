FROM node:18-alpine

# Çalışma dizinini oluştur
WORKDIR /app

# Paket dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install --production

# Tüm proje dosyalarını kopyala
COPY . .

# Veritabanı ve Upload klasörleri için izinler (SQLite ve Resimler için)
# Not: Volume mapping yapılacağı için bu klasörlerin container içinde yazılabilir olması önemli
RUN mkdir -p database uploads uploads/profiles uploads/receipts uploads/messages uploads/groups uploads/reports && \
    chmod -R 777 database uploads

# Portu dışa aç
EXPOSE 3005

# Uygulamayı başlat
CMD ["npm", "start"]
