import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Alert, Platform, Image, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { requestBatteryOptimizationExemption } from '../utils/batteryOptimization';
import api, { API_BASE_URL } from '../services/api';

export default function ProfileScreen() {
    const { user, logout, forgetAccount } = useAuth();

    const [loading, setLoading] = React.useState(false);
    const [showPasswordModal, setShowPasswordModal] = React.useState(false);
    const [passwords, setPasswords] = React.useState({
        current: '',
        new: '',
        confirm: ''
    });

    const handlePasswordChange = async () => {
        if (!passwords.current || !passwords.new || !passwords.confirm) {
            Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
            return;
        }
        if (passwords.new !== passwords.confirm) {
            Alert.alert('Hata', 'Yeni şifreler eşleşmiyor.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.put('/users/change-password', {
                currentPassword: passwords.current,
                newPassword: passwords.new
            });
            if (res.data.success) {
                Alert.alert('Başarılı', 'Şifreniz başarıyla güncellendi.');
                setShowPasswordModal(false);
                setPasswords({ current: '', new: '', confirm: '' });
            }
        } catch (error) {
            Alert.alert('Hata', error.response?.data?.error || 'Şifre değiştirilemedi.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Çıkış Yap',
            'Çıkış yapmak istediğinize emin misiniz? (Konum takibi devam edecek)',
            [
                { text: 'İptal', style: 'cancel' },
                { text: 'Çıkış Yap', style: 'destructive', onPress: logout },
            ]
        );
    };

    const handleForgetAccount = () => {
        Alert.alert(
            'Hesabı Unut',
            'Bu cihazdan hesap bilgilerini tamamen silmek ve konum takibini durdurmak istediğinize emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Evet, Unut',
                    style: 'destructive',
                    onPress: async () => {
                        await forgetAccount();
                        Alert.alert('Başarılı', 'Hesap bilgileri silindi. Konum takibi durduruldu.');
                    }
                },
            ]
        );
    };

    const handleBatteryOptimization = () => {
        Alert.alert(
            'Batarya Optimizasyonu',
            'Uygulama kapalıyken bile konum takibi için batarya optimizasyonunu kapatmanız önerilir. Ayarlar açılacak, "Atılım Gıda" uygulamasını bulup "Optimize edilmesin" seçeneğini seçin.',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Ayarları Aç',
                    onPress: () => requestBatteryOptimizationExemption()
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profil</Text>
            </View>

            <View style={styles.content}>
                {/* User Info Card */}
                <View style={styles.card}>
                    <View style={styles.avatarContainer}>
                        {user?.profile_photo ? (
                            <Image source={{ uri: `${API_BASE_URL}/${user.profile_photo}` }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.userName}>{user?.full_name || 'Kullanıcı'}</Text>
                    <Text style={styles.userRole}>{user?.role === 'admin' ? 'Admin' : 'Personel'}</Text>
                </View>

                {/* Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Hesap İşlemleri</Text>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPasswordModal(true)}>
                        <Ionicons name="lock-closed-outline" size={24} color="#6b7280" />
                        <Text style={styles.actionText}>Şifre Değiştir</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={24} color="#6b7280" />
                        <Text style={styles.actionText}>Çıkış Yap</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </TouchableOpacity>

                    {Platform.OS === 'android' && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fef3c7', borderColor: '#fde047', borderWidth: 1 }]} onPress={handleBatteryOptimization}>
                            <Ionicons name="battery-charging-outline" size={24} color="#ca8a04" />
                            <Text style={[styles.actionText, { color: '#92400e' }]}>Batarya Optimizasyonunu Kapat</Text>
                            <Ionicons name="chevron-forward" size={20} color="#ca8a04" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={handleForgetAccount}>
                        <Ionicons name="trash-outline" size={24} color="#dc2626" />
                        <Text style={[styles.actionText, styles.dangerText]}>Hesabı Unut (Konum takibini durdur)</Text>
                        <Ionicons name="chevron-forward" size={20} color="#dc2626" />
                    </TouchableOpacity>
                </View>

                {/* Password Change Modal */}
                <View>
                    {showPasswordModal && (
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                <Text style={styles.modalTitle}>Şifre Değiştir</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Mevcut Şifre"
                                    secureTextEntry
                                    value={passwords.current}
                                    onChangeText={(t) => setPasswords(p => ({ ...p, current: t }))}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Yeni Şifre"
                                    secureTextEntry
                                    value={passwords.new}
                                    onChangeText={(t) => setPasswords(p => ({ ...p, new: t }))}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Yeni Şifre (Tekrar)"
                                    secureTextEntry
                                    value={passwords.confirm}
                                    onChangeText={(t) => setPasswords(p => ({ ...p, confirm: t }))}
                                />
                                <View style={styles.modalBtns}>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, styles.cancelBtn]}
                                        onPress={() => setShowPasswordModal(false)}
                                    >
                                        <Text style={styles.cancelBtnText}>İptal</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, styles.saveBtn]}
                                        onPress={handlePasswordChange}
                                        disabled={loading}
                                    >
                                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Güncelle</Text>}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        ℹ️ "Çıkış Yap" butonu sadece ekrandan çıkış yapar, konum takibi devam eder.
                    </Text>
                    <Text style={styles.infoText}>
                        🔴 "Hesabı Unut" butonu tüm bilgileri siler ve konum takibini durdurur.
                    </Text>
                    {Platform.OS === 'android' && (
                        <Text style={styles.infoText}>
                            🔋 Uygulama kapalıyken bile konum takibi için batarya optimizasyonunu kapatın.
                        </Text>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    content: { padding: 16 },
    card: { backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    avatarContainer: { marginBottom: 16 },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 32, fontWeight: 'bold', color: 'white' },
    avatar: { width: 80, height: 80, borderRadius: 40 },
    userName: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
    userRole: { fontSize: 14, color: '#6b7280', textTransform: 'capitalize' },
    section: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: '#f9fafb', marginBottom: 8 },
    actionText: { flex: 1, marginLeft: 12, fontSize: 15, color: '#374151' },
    dangerBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
    dangerText: { color: '#dc2626' },
    infoBox: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#dbeafe' },
    infoText: { fontSize: 13, color: '#1e40af', marginBottom: 8, lineHeight: 20 },
    // Modal Styles
    modalOverlay: { position: 'absolute', top: -100, left: -20, right: -20, bottom: -500, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContainer: { width: '90%', backgroundColor: 'white', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 10 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 15, textAlign: 'center' },
    input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, color: '#1f2937' },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
    modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
    cancelBtn: { backgroundColor: '#f3f4f6' },
    saveBtn: { backgroundColor: '#2563EB' },
    cancelBtnText: { color: '#4b5563', fontWeight: '600' },
    saveBtnText: { color: 'white', fontWeight: 'bold' }
});
