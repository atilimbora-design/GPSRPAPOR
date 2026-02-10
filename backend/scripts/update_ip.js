const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // IPv4 ve internal olmayan (localhost olmayan) adresi bul
            if (iface.family === 'IPv4' && !iface.internal) {
                // Genelde 192.168... ile başlar ev/ofis ağları
                if (iface.address.startsWith('192.168.')) {
                    return iface.address;
                }
            }
        }
    }
    return '127.0.0.1';
}

const ip = getLocalIP();
console.log(`Detected IP Address: ${ip}`);

// Dosya Yolları
const apiPath = path.join('c:/Users/user/Documents/Atilim/mobile/src/services/api.js');
const socketPath = path.join('c:/Users/user/Documents/Atilim/mobile/src/services/socket.js');

// Güncelleme Fonksiyonu
function updateFile(filePath, oldIP, newIP) {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        // Regex ile eski IP ne olursa olsun (port 3000 ile biten) değiştir
        const regex = /http:\/\/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:3000/g;
        const newUrl = `http://${newIP}:3000`;

        if (content.match(regex)) {
            content = content.replace(regex, newUrl);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${filePath} with ${newUrl}`);
        } else {
            console.log(`No IP pattern found in ${filePath}`);
        }
    } else {
        console.log(`File not found: ${filePath}`);
    }
}

updateFile(apiPath, '', ip);
updateFile(socketPath, '', ip);
