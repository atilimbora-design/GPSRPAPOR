import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { stopBackgroundTracking } from '../components/LocationTracker';
import io from 'socket.io-client';
import { Alert } from 'react-native';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for persisted user (only if "remember me" was checked)
        const loadUser = async () => {
            try {
                const rememberMe = await AsyncStorage.getItem('rememberMe');
                if (rememberMe === 'true') {
                    const token = await AsyncStorage.getItem('token');
                    const userJson = await AsyncStorage.getItem('user');

                    if (token && userJson) {
                        setUser(JSON.parse(userJson));
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    // ✅ Listen for force logout from backend
    useEffect(() => {
        if (!user) return;

        const token = AsyncStorage.getItem('token');
        const socket = io('http://192.168.1.104:5000', {
            auth: { token },
            query: { userId: user.id }
        });

        socket.on('force_logout', (data) => {
            console.log('🔒 Force logout received:', data);

            Alert.alert(
                'Oturum Kapatıldı',
                data.message || 'Hesabınız başka bir cihazdan giriş yaptı.',
                [
                    {
                        text: 'Tamam',
                        onPress: async () => {
                            await forgetAccount();
                        }
                    }
                ],
                { cancelable: false }
            );
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    const login = async (username, password, rememberMe = false) => {
        try {
            const res = await api.post('/auth/login', { username, password, platform: 'mobile' });
            if (res.data.success) {
                const { token, user } = res.data;
                await AsyncStorage.setItem('token', token);
                await AsyncStorage.setItem('user', JSON.stringify(user));
                await AsyncStorage.setItem('userId', user.id.toString()); // For background tracking

                // Remember Me
                if (rememberMe) {
                    await AsyncStorage.setItem('rememberMe', 'true');
                } else {
                    await AsyncStorage.removeItem('rememberMe');
                }

                setUser(user);
                return { success: true };
            }
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Giriş yapılamadı'
            };
        }
    };

    const logout = async () => {
        try {
            // Sadece user state'ini temizle ama token'ı bırak (eğer remember me varsa)
            setUser(null);
        } catch (e) {
            console.error(e);
        }
    };

    const forgetAccount = async () => {
        try {
            // Tüm bilgileri sil ve location tracking'i durdur
            await stopBackgroundTracking();
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('rememberMe');
            await AsyncStorage.removeItem('userId');
            setUser(null);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, forgetAccount }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
