import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_URL = 'https://takip.atilimgida.com/api';
export const API_BASE_URL = 'https://takip.atilimgida.com'; // For image URLs

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10s timeout
    headers: {
        'Content-Type': 'application/json',
    }
});

// Request Interceptor
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Token expired or invalid
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            // Navigate to login handled by AuthContext state
        }

        // Enhance error message
        const customError = {
            ...error,
            message: error.response?.data?.error || error.message || 'Bir hata oluştu'
        };

        return Promise.reject(customError);
    }
);

export default api;
