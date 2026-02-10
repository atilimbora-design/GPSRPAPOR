import { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await api.get('/users/me');
                    if (res.data.success) {
                        setUser(res.data.user);
                    }
                } catch (error) {
                    console.error("Auth check failed", error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (username, password) => {
        try {
            const res = await api.post('/auth/login', {
                username,
                password,
                platform: 'web' // Only admin/web allowed
            });

            if (res.data.success) {
                localStorage.setItem('token', res.data.token);
                setUser(res.data.user);
                return { success: true };
            }
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Giriş başarısız'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
