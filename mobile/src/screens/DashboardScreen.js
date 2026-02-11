import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import LocationTracker from '../components/LocationTracker';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen({ navigation }) {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try {
            const res = await api.get('/users/stats');
            if (res.data.success) {
                setStats(res.data.stats);
            }
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchStats().then(() => setRefreshing(false));
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <LocationTracker user={user} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Merhaba,</Text>
                    <Text style={styles.username}>{user?.full_name || user?.username}</Text>
                </View>
                <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Stats Card */}
                <View style={styles.mainStatsCard}>
                    <Text style={styles.mainStatsTitle}>Toplam Tahsilat</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Bugün</Text>
                            <Text style={styles.statValue}>{stats?.daily || 0}</Text>
                            <Text style={styles.statUnit}>TL</Text>
                        </View>
                        <View style={styles.statSeparator} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Bu Hafta</Text>
                            <Text style={styles.statValue}>{stats?.weekly || 0}</Text>
                            <Text style={styles.statUnit}>TL</Text>
                        </View>
                        <View style={styles.statSeparator} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Bu Ay</Text>
                            <Text style={styles.statValue}>{stats?.monthly || 0}</Text>
                            <Text style={styles.statUnit}>TL</Text>
                        </View>
                    </View>
                </View>


                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('NewReport')}>
                        <View style={[styles.iconBox, { backgroundColor: '#e0e7ff' }]}>
                            <Ionicons name="document-text" size={24} color="#4338ca" />
                        </View>
                        <Text style={styles.actionText}>Rapor Gir</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateOrder')}>
                        <View style={[styles.iconBox, { backgroundColor: '#fae8ff' }]}>
                            <Ionicons name="cart" size={24} color="#a21caf" />
                        </View>
                        <Text style={styles.actionText}>Sipariş Oluştur</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
                    <Text style={styles.infoText}>Konum takibi arka planda aktiftir.</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    greeting: { fontSize: 16, color: '#6b7280' },
    username: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    logoutBtn: { padding: 8, backgroundColor: '#fee2e2', borderRadius: 8 },
    content: { padding: 20 },
    statsContainer: { flexDirection: 'row', gap: 16, marginBottom: 24 },
    card: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    cardValue: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginTop: 8 },
    cardLabel: { fontSize: 14, color: '#6b7280' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    actionBtn: { width: '47%', backgroundColor: 'white', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    actionText: { fontWeight: '600', color: '#374151' },
    infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8 },
    infoText: { color: '#6b7280', fontSize: 13 },

    // New Stats Card Styles
    mainStatsCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    mainStatsTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 16, textAlign: 'center' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statItem: { flex: 1, alignItems: 'center' },
    statLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
    statValue: { fontSize: 20, fontWeight: 'bold', color: '#2563EB' },
    statUnit: { fontSize: 11, color: '#9CA3AF' },
    statSeparator: { width: 1, height: 30, backgroundColor: '#E5E7EB' }
});
