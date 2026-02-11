import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Hata', 'Lütfen kullanıcı adı ve şifre giriniz.');
            return;
        }

        setLoading(true);
        const res = await login(username, password, rememberMe);
        setLoading(false);

        if (!res.success) {
            Alert.alert('Giriş Başarısız', res.error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.formContainer}>
                <View style={styles.logoContainer}>
                    {/* Placeholder for Logo */}
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoText}>ATILIM</Text>
                    </View>
                    <Text style={styles.title}>Personel Takip Sistemi</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Kullanıcı Adı</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Kullanıcı Adınız"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <Text style={styles.label}>Şifre</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Şifreniz"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={true}
                    />

                    {/* Remember Me Checkbox */}
                    <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => setRememberMe(!rememberMe)}
                    >
                        <Ionicons
                            name={rememberMe ? "checkbox" : "square-outline"}
                            size={24}
                            color={rememberMe ? "#2563EB" : "#9ca3af"}
                        />
                        <Text style={styles.checkboxLabel}>Beni Hatırla (Konum takibi devam eder)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>{loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    formContainer: { // Replaces keyboardView style
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoPlaceholder: {
        width: 100,
        height: 100,
        backgroundColor: '#2563EB',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    form: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 8,
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    button: {
        backgroundColor: '#2563EB',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
