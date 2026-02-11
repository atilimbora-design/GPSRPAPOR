import React, { useEffect } from 'react';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as TaskManager from 'expo-task-manager';
import socket from '../services/socket';
// AuthContext import removed to fix circular dependency
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_TASK_NAME = 'background-location-task';

// Background task tanımı (Component dışında)
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Background Location Error:', error);
        return;
    }
    if (data) {
        const { locations } = data;
        const location = locations[0];

        // UserId ve token'ı storage'dan al
        const userId = await AsyncStorage.getItem('userId');
        const token = await AsyncStorage.getItem('token');

        if (!userId || !token) {
            console.log('No user logged in, skipping location update');
            return;
        }

        // Batarya seviyesini al
        let batteryLevel = 100;
        try {
            batteryLevel = Math.round((await Battery.getBatteryLevelAsync()) * 100);
        } catch (err) {
            console.log("Battery info not available");
        }

        const { latitude, longitude, speed, heading, accuracy } = location.coords;

        console.log('[Background] Location Update:', latitude, longitude, 'Battery:', batteryLevel);

        // 1. Send via HTTP (Reliable Fallback)
        try {
            // Import api dynamically or use axios directly to avoid circular dependency if any
            const response = await fetch('https://takip.atilimgida.com/api/gps/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    latitude,
                    longitude,
                    speed: speed || 0,
                    battery_level: batteryLevel,
                    accuracy: accuracy || 0,
                    timestamp: new Date(location.timestamp).toISOString()
                })
            });
            console.log('[Background] HTTP Update Status:', response.status);
        } catch (err) {
            console.error('[Background] HTTP Update Failed:', err.message);
        }

        // 2. Send via Socket (Real-time if connection is alive)
        if (socket.connected) {
            socket.emit('locationUpdate', {
                userId: parseInt(userId),
                latitude,
                longitude,
                speed: speed || 0,
                heading,
                batteryLevel,
                timestamp: location.timestamp
            });
        }
    }
});

export default function LocationTracker({ user }) {
    // useAuth hook removed

    useEffect(() => {
        if (!user) {
            // Kullanıcı çıkış yaptıysa background tracking'i durdur
            stopBackgroundTracking();
            return;
        }

        // UserId'yi storage'a kaydet (background task için)
        AsyncStorage.setItem('userId', user.id.toString());

        const startTracking = async () => {
            try {
                // 1. Ön plan izni
                const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
                if (foregroundStatus !== 'granted') {
                    Alert.alert('İzin Hatası', 'Konum takibi için izin gerekli.');
                    return;
                }

                // 2. Arka plan izni (kritik!)
                const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
                if (backgroundStatus !== 'granted') {
                    Alert.alert('Arka Plan İzni', 'Uygulama kapalıyken konum takibi için lütfen arka plan iznini verin.');
                }

                // 3. Socket Bağla
                if (!socket.connected) {
                    socket.auth = { token: user.token };
                    socket.connect();
                    console.log('Socket connecting...');

                    socket.on('connect', () => {
                        console.log('Socket connected:', socket.id);
                        socket.emit('register', user.id);
                    });
                }

                // 4. Background Location Tracking Başlat
                const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
                if (!isRegistered) {
                    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                        accuracy: Location.Accuracy.Balanced, // Background için Balanced daha kararlı
                        timeInterval: 10000, // 10 saniye
                        distanceInterval: 10,
                        foregroundService: {
                            notificationTitle: 'Atılım Gıda Aktif',
                            notificationBody: 'Konumunuz güvenli takip ediliyor.',
                            notificationColor: '#2563EB',
                            killServiceOnTerminate: false,
                        },
                        pausesUpdatesAutomatically: false,
                        showsBackgroundLocationIndicator: true,
                    });
                    console.log('Background location tracking started (Persistent)');
                } else {
                    console.log('Background location tracking already active');
                }

                // 5. Foreground Location Tracking (Ekstra katman)
                await Location.watchPositionAsync({
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000,
                    distanceInterval: 5,
                }, (location) => {
                    const { latitude, longitude, speed, heading, accuracy } = location.coords;

                    // Socket üzerinden gönder (Ön planda socket daha iyidir)
                    if (socket.connected) {
                        socket.emit('locationUpdate', {
                            userId: parseInt(user.id),
                            latitude,
                            longitude,
                            speed: speed || 0,
                            heading,
                            batteryLevel: 100, // Background değilse 100 veya opsiyonel
                            timestamp: location.timestamp
                        });
                    }
                });

            } catch (err) {
                console.error("Tracking Error:", err);
                Alert.alert('Hata', 'Konum takibi başlatılamadı: ' + err.message);
            }
        };

        startTracking();

        // Reconnect Checker (Keep Alive)
        const connectionInterval = setInterval(() => {
            if (user && !socket.connected) {
                console.log('Checking socket connection... Reconnecting.');
                socket.connect();
            }
        }, 10000);

        return () => {
            clearInterval(connectionInterval);
        };
    }, [user]);

    return null;
}

// Çıkış yapıldığında çağrılacak fonksiyon
export async function stopBackgroundTracking() {
    const hasTask = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (hasTask) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log('Background tracking stopped');
    }

    // Storage'dan user bilgisini sil
    await AsyncStorage.removeItem('userId');

    // Socket bağlantısını kes
    if (socket.connected) {
        socket.disconnect();
    }
}
