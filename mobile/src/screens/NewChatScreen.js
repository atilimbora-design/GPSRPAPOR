import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NewChatScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // Fetch all users (admins and personnel)
                const res = await api.get('/users');
                if (res.data.success) {
                    setUsers(res.data.users);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.userItem}
            onPress={() => {
                navigation.replace('ChatDetail', {
                    targetId: item.id,
                    targetName: item.full_name,
                    type: 'direct',
                    photo: item.profile_photo
                });
            }}
        >
            <View style={styles.avatarContainer}>
                {item.profile_photo ? (
                    <Image source={{ uri: `${API_BASE_URL}/${item.profile_photo}` }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{item.full_name[0]}</Text>
                    </View>
                )}
            </View>
            <View>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.role}>{item.role === 'admin' ? 'Yönetici' : 'Personel'}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="close" size={28} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Yeni Sohbet</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={
                        <TouchableOpacity style={styles.createGroupBtn} onPress={() => navigation.navigate('CreateGroup')}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="people" size={24} color="#2563EB" />
                            </View>
                            <Text style={styles.createGroupText}>Yeni Grup Oluştur</Text>
                        </TouchableOpacity>
                    }
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', marginTop: 20, color: 'gray' }}>Kullanıcı bulunamadı.</Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    backBtn: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    list: { padding: 16 },
    userItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    avatarContainer: { marginRight: 12 },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 20, fontWeight: 'bold', color: '#6b7280' },
    name: { fontSize: 16, fontWeight: '600', color: '#111827' },
    role: { fontSize: 13, color: '#6b7280', textTransform: 'capitalize' },
    createGroupBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingVertical: 10 },
    iconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    createGroupText: { fontSize: 16, fontWeight: 'bold', color: '#2563EB' }
});
