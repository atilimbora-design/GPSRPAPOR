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

        const userId = await AsyncStorage.getItem('userId');
        const token = await AsyncStorage.getItem('token');

        if (!userId || !token) return;

        let batteryLevel = 100;
        try {
            batteryLevel = Math.round((await Battery.getBatteryLevelAsync()) * 100);
        } catch (err) { }

        const { latitude, longitude, speed, heading, accuracy } = location.coords;

        // 1. Send via HTTP (Zaman aşımı kontrollü sert istek)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye limit

        try {
            await fetch('https://takip.atilimgida.com/api/gps/update', {
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
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
        } catch (err) {
            console.log('[Background] HTTP update failed or timed out');
        }

        // 2. Socket (Önemli: Arka planda soket bazen uyur, HTTP üstteki asıl garantimizdir)
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
    useEffect(() => {
        if (!user) {
            stopBackgroundTracking();
            return;
        }

        AsyncStorage.setItem('userId', user.id.toString());

        const startTracking = async () => {
            try {
                const { status: foreStatus } = await Location.requestForegroundPermissionsAsync();
                const { status: backStatus } = await Location.requestBackgroundPermissionsAsync();

                if (foreStatus !== 'granted' || backStatus !== 'granted') {
                    Alert.alert('Kritik İzin Eksik', 'Kesintisiz takip için "Her zaman izin ver" seçeneğini seçmelisiniz.');
                    return;
                }

                if (!socket.connected) {
                    socket.auth = { token: user.token };
                    socket.connect();
                }

                // 4. Derin Takip Ayarları (Life360 Tarzı)
                const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
                if (!isRegistered) {
                    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                        accuracy: Location.Accuracy.Highest, // En yüksek hassasiyet
                        timeInterval: 10000,
                        distanceInterval: 10,
                        // Bu kısım Android/iOS'un uygulamayı "Navigasyon" sanmasını sağlar
                        activityType: Location.ActivityType.AutomotiveNavigation,
                        foregroundService: {
                            notificationTitle: 'Atılım Gıda: Takip Aktif',
                            notificationBody: 'Saha operasyonu için konumunuz başarıyla aktarılıyor.',
                            notificationColor: '#2563EB',
                            killServiceOnTerminate: false,
                        },
                        pausesUpdatesAutomatically: false,
                        showsBackgroundLocationIndicator: true,
                        deferredUpdatesInterval: 10000,
                        deferredUpdatesDistance: 10,
                    });
                    console.log('Deep tracking started');
                }

                // 5. Ön Planda İzleme
                await Location.watchPositionAsync({
                    accuracy: Location.Accuracy.Highest,
                    timeInterval: 5000,
                    distanceInterval: 5,
                }, (location) => {
                    if (socket.connected) {
                        socket.emit('locationUpdate', {
                            userId: parseInt(user.id),
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            speed: location.coords.speed || 0,
                            batteryLevel: 100,
                            timestamp: location.timestamp
                        });
                    }
                });

            } catch (err) {
                console.error("Tracking error:", err);
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
