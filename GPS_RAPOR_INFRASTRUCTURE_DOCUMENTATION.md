# GPS RAPOR - Tam Altyapı ve Proje Dokümantasyonu

## DONANIM VE SUNUCU BİLGİLERİ

### Raspberry Pi 5 Özellikleri
- **Model**: Raspberry Pi 5
- **RAM**: 16GB
- **Depolama**: 1TB M.2 SSD
- **Okuma Hızı**: 700-750 MB/s
- **Yerel IP**: 192.168.1.104
- **Coolify Şifresi**: 444EgeBEST@
- **Pi Kullanıcı Şifresi**: 2751

### Ağ Yapısı
- **Yerel Erişim**: http://192.168.1.104:3000
- **Dış Erişim**: https://takip.atilimgida.com
- **Cloudflare Tunnel**: Aktif
- **SSL**: Let's Encrypt (Otomatik)

## GİT VE KAYNAK KOD YÖNETİMİ

### GitHub Repository
- **URL**: https://github.com/atilimbora-design/GPSRPAPOR.git
- **SSH**: git@github.com:atilimbora-design/GPSRPAPOR.git
- **Clone Komutu**: `gh repo clone atilimbora-design/GPSRPAPOR`
- **Branch**: main
- **Sahip**: atilimbora-design

### Coolify Git Entegrasyonu
- **Repository**: atilimbora-design/GPSRPAPOR
- **Branch**: main
- **Auto Deploy**: Aktif
- **Webhook**: Yapılandırılmış

## COOLIFY KONFIGÜRASYONU

### Genel Ayarlar
- **Proje Adı**: atilimbora-design/g-p-s-r-p-a-p-o-r-main-10wo8o8044ssbooq80qxcz0
- **Build Pack**: Dockerfile
- **Domain**: https://takip.atilimgida.com
- **Direction**: Allow www & non-www

### Docker Ayarları
- **Base Directory**: /
- **Dockerfile Location**: /backend/Dockerfile
- **Docker Build Stage Target**: (Varsayılan)
- **Custom Docker Options**: 
  ```
  --cap-add SYS_ADMIN --device /dev/fuse --security-opt apparmor:unconfined --security-opt seccomp=unconfined --mount type=tmpfs,destination=/tmp --mount type=tmpfs,destination=/var/tmp --mount type=tmpfs,destination=/run --mount type=tmpfs,destination=/var/run --mount type=tmpfs,destination=/run/lock --mount type=tmpfs,destination=/var/lock --mount type=tmpfs,destination=/sys/fs/cgroup --mount type=tmpfs,destination=/var/lib/systemd --mount type=tmpfs,destination=/var/lib/private --mount type=tmpfs,destination=/tmp --mount type=tmpfs,destination=/var/tmp
  ```

### Network Ayarları
- **Port Expose**: 3000
- **Port Mapping**: 3006:3000
- **Network Aliases**: (Yok)

## TRAEFIK REVERSE PROXY KONFIGÜRASYONU

### Labels ve Middleware
```yaml
# Temel Traefik Ayarları
traefik.enable: true
traefik.http.middlewares.gzip.compress: true

# HTTP Basic Auth
traefik.http.middlewares.http-basic-auth-hk480g88o84wocws4ksw00s0.basicauth.users: admin:$2y$10$avzk2l/zBp0dnP/jRNc4COCNz4Rq4WWnzjAzKKBhBxqSLJaVViCRS

# HTTPS Redirect
traefik.http.middlewares.redirect-to-https.redirectscheme.scheme: https

# HTTP Router
traefik.http.routers.http-0-hk480g88o84wocws4ksw00s0.entryPoints: http
traefik.http.routers.http-0-hk480g88o84wocws4ksw00s0.middlewares: redirect-to-https
traefik.http.routers.http-0-hk480g88o84wocws4ksw00s0.rule: Host(`takip.atilimgida.com`) && PathPrefix(`/`)
traefik.http.routers.http-0-hk480g88o84wocws4ksw00s0.service: http-0-hk480g88o84wocws4ksw00s0

# HTTPS Router
traefik.http.routers.https-0-hk480g88o84wocws4ksw00s0.entryPoints: https
traefik.http.routers.https-0-hk480g88o84wocws4ksw00s0.middlewares: gzip,remove-csp
traefik.http.routers.https-0-hk480g88o84wocws4ksw00s0.rule: Host(`takip.atilimgida.com`) && PathPrefix(`/`)
traefik.http.routers.https-0-hk480g88o84wocws4ksw00s0.service: https-0-hk480g88o84wocws4ksw00s0
traefik.http.routers.https-0-hk480g88o84wocws4ksw00s0.tls.certresolver: letsencrypt
traefik.http.routers.https-0-hk480g88o84wocws4ksw00s0.tls: true

# Services
traefik.http.services.http-0-hk480g88o84wocws4ksw00s0.loadbalancer.server.port: 3000
traefik.http.services.https-0-hk480g88o84wocws4ksw00s0.loadbalancer.server.port: 3000

# CSP Removal
traefik.http.middlewares.remove-csp.headers.customresponseheaders.Content-Security-Policy: ""

# Update Router (APK Downloads)
traefik.http.routers.update-hk480g88o84wocws4ksw00s0.rule: Host(`takip.atilimgida.com`) && (PathPrefix(`/app/version`) || PathPrefix(`/uploads/apks`))
traefik.http.routers.update-hk480g88o84wocws4ksw00s0.entryPoints: https
traefik.http.routers.update-hk480g88o84wocws4ksw00s0.service: https-0-hk480g88o84wocws4ksw00s0
traefik.http.routers.update-hk480g88o84wocws4ksw00s0.middlewares: gzip,remove-csp
```

## CADDY KONFIGÜRASYONU

### Caddy Labels
```yaml
caddy_0.basicauth.admin: "$2y$10$.3Smiqp57CidzX8DWA4q9.zRsV3OzQN.MNJ9H4SO/7DvitkKN10Du"
caddy_0.encode: zstd gzip
caddy_0.handle_path.0_reverse_proxy: "{{upstreams 3000}}"
caddy_0.handle_path: /*
caddy_0.header: -Server
caddy_0.try_files: "{path} /index.html /index.php"
caddy_0: https://takip.atilimgida.com
caddy_ingress_network: coolify
caddy_0.header: -Content-Security-Policy
```

## GÜVENLİK VE KİMLİK DOĞRULAMA

### HTTP Basic Authentication
- **Kullanıcı Adı**: admin
- **Şifre Hash**: $2y$10$avzk2l/zBp0dnP/jRNc4COCNz4Rq4WWnzjAzKKBhBxqSLJaVViCRS
- **Şifre**: 444EgeBEST@

### Caddy Basic Auth
- **Kullanıcı Adı**: admin  
- **Şifre Hash**: $2y$10$.3Smiqp57CidzX8DWA4q9.zRsV3OzQN.MNJ9H4SO/7DvitkKN10Du

## WEBHOOK KONFIGÜRASYONU

### Deploy Webhook
- **URL**: http://195.175.34.118:8000/api/v1/deploy?uuid=rs4t8g8o84ssbooq80qxcz0&force=false
- **Tetikleyici**: GitHub Push (main branch)

### Manual Git Webhooks
- **GitHub**: http://195.175.34.118:8000/webhooks/source/github/events/manual
- **GitLab**: http://195.175.34.118:8000/webhooks/source/gitlab/events/manual  
- **Bitbucket**: http://195.175.34.118:8000/webhooks/source/bitbucket/events/manual
- **Gitea**: http://195.175.34.118:8000/webhooks/source/gitea/events/manual

### Webhook Secrets
- **GitHub Webhook Secret**: [Gizli]
- **GitLab Webhook Secret**: [Gizli]
- **Bitbucket Webhook Secret**: [Gizli]
- **Gitea Webhook Secret**: [Gizli]

## PROJE YAPISI VE DEPLOYMENT

### Docker Build Süreci
1. **Base Image**: node:18-alpine
2. **Working Directory**: /app
3. **Copy Files**: package*.json → npm install
4. **Copy Source**: . → /app
5. **Expose Port**: 3000
6. **Start Command**: npm start

### Dosya Yapısı (Container İçi)
```
/app/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── database.sqlite
│   ├── personel/ (23 klasör)
│   └── uploads/
├── frontend/ (Build edilmiş)
└── package.json
```

### Environment Variables
```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=gps_rapor_secret_key_change_this
```

## MONITORING VE LOGS

### Coolify Dashboard
- **URL**: http://192.168.1.104:8000
- **Kullanıcı**: admin
- **Şifre**: 444EgeBEST@

### Container Logs
- **Erişim**: Coolify Dashboard → Applications → GPS RAPOR → Logs
- **Real-time**: Aktif
- **Log Level**: INFO

### Sistem Monitoring
- **CPU Kullanımı**: Coolify Dashboard
- **RAM Kullanımı**: Coolify Dashboard  
- **Disk Kullanımı**: Coolify Dashboard
- **Network Trafiği**: Coolify Dashboard

## BACKUP VE RECOVERY

### Otomatik Backup
- **Veritabanı**: SQLite dosyası (database.sqlite)
- **Personel Dosyaları**: /app/personel/ klasörü
- **Upload Dosyaları**: /app/uploads/ klasörü

### Manual Backup Komutu
```bash
# Container içinden
docker exec -it <container_id> tar -czf /tmp/backup.tar.gz /app/database.sqlite /app/personel /app/uploads

# Host'a kopyala
docker cp <container_id>:/tmp/backup.tar.gz ./backup-$(date +%Y%m%d).tar.gz
```

## PERFORMANS VE OPTIMIZASYON

### Raspberry Pi 5 Performansı
- **CPU**: ARM Cortex-A76 (4 çekirdek)
- **RAM Kullanımı**: ~2-4GB (Node.js + SQLite)
- **Disk I/O**: 700-750 MB/s (M.2 SSD)
- **Network**: Gigabit Ethernet

### Optimizasyon Ayarları
- **Gzip Compression**: Aktif (Traefik)
- **Static File Serving**: Express.js
- **Database**: SQLite (Dosya tabanlı)
- **Socket.io**: Real-time optimizasyonu

## TROUBLESHOOTING

### Yaygın Sorunlar
1. **Container Başlamıyor**: Logs kontrol et
2. **Database Hatası**: SQLite dosya izinleri
3. **Socket.io Bağlantı Sorunu**: CORS ayarları
4. **SSL Sertifika**: Let's Encrypt yenileme

### Debug Komutları
```bash
# Container durumu
docker ps | grep gps

# Logs
docker logs <container_id> -f

# Container içine gir
docker exec -it <container_id> /bin/sh

# Port kontrolü
netstat -tulpn | grep 3000
```

## GÜNCELLEME VE DEPLOYMENT

### Otomatik Deployment
1. **GitHub'a Push** → main branch
2. **Webhook Tetiklenir** → Coolify
3. **Docker Build** → Yeni image
4. **Container Restart** → Yeni versiyon

### Manual Deployment
1. Coolify Dashboard → Applications
2. GPS RAPOR → Deploy
3. "Force Rebuild" seçeneği

## NETWORK VE FIREWALL

### Port Yapısı
- **3000**: Node.js Application (Internal)
- **3006**: External Port Mapping
- **80/443**: Traefik Reverse Proxy
- **8000**: Coolify Dashboard

### Cloudflare Tunnel
- **Tunnel ID**: [Gizli]
- **Connector**: Raspberry Pi 5
- **SSL Mode**: Full (Strict)

## SONUÇ

GPS RAPOR projesi Raspberry Pi 5 üzerinde Coolify ile başarıyla deploy edilmiş durumda. Traefik reverse proxy, Let's Encrypt SSL, Cloudflare Tunnel ve GitHub entegrasyonu ile tam otomatik bir altyapı kurulmuştur.

**Kritik Bilgiler:**
- Raspberry Pi IP: 192.168.1.104
- Pi Kullanıcı Şifresi: 2751
- Coolify Şifre: 444EgeBEST@
- HTTP Basic Auth: admin / 444EgeBEST@
- Domain: https://takip.atilimgida.com
- GitHub: atilimbora-design/GPSRPAPOR
- Container Port: 3000 → 3006

Sistem 7/24 çalışır durumda ve otomatik güncellemeler aktiftir.