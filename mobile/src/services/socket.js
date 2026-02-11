import io from 'socket.io-client';
import api from './api';

// Socket bağlantısını oluştur
// API_URL backend adresini alıyor (örn: http://192.168.1.144:3000/api)
// Bize kök adres lazım: http://192.168.1.144:3000
const API_URL = 'https://takip.atilimgida.com'; // Backend IP'niz

const socket = io(API_URL, {
    transports: ['websocket'],
    autoConnect: false, // Manuel bağlayacağız
});

export default socket;
