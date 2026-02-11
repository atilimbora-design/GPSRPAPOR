import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { API_BASE_URL } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatListScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchConversations = async () => {
        try {
            const res = await api.get('/messages/conversations');
            if (res.data.success) {
                setConversations(res.data.conversations);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchConversations();
            const interval = setInterval(fetchConversations, 5000); // Poll every 5s
            return () => clearInterval(interval);
        }, [])
    );

    const renderItem = ({ item }) => {
        const targetId = item.type === 'direct' ? item.user_id : item.group_id;
        const name = item.type === 'direct' ? item.full_name : item.group_name;
        const photo = item.type === 'direct' ? item.profile_photo : item.group_photo;

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => navigation.navigate('ChatDetail', {
                    targetId,
                    targetName: name,
                    type: item.type,
                    photo
                })}
            >
                <View style={styles.avatarContainer}>
                    {photo ? (
                        <Image source={{ uri: `${API_BASE_URL}/${photo}` }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{name ? name[0].toUpperCase() : '?'}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.name}>{name}</Text>
                        <Text style={styles.time}>
                            {item.last_message ? new Date(item.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                    </View>
                    <View style={styles.footer}>
                        <Text style={styles.message} numberOfLines={1}>
                            {item.last_message ? (item.last_message.message_type === 'image' ? '📷 Fotoğraf' : item.last_message.content) : 'Mesaj yok'}
                        </Text>
                        {item.unread_count > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{item.unread_count}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.topHeader}>
                <Text style={styles.pageTitle}>Mesajlar</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={conversations}
                    renderItem={renderItem}
                    keyExtractor={item => (item.type + (item.user_id || item.group_id)).toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>Henüz mesajınız yok.</Text>
                            <Text style={styles.subEmptyText}>Yeni bir sohbet başlatmak için aşağıdaki butonu kullanın.</Text>
                        </View>
                    }
                />
            )}

            {/* FAB to Start New Chat */}
            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewChat')}>
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    topHeader: { padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    listContent: { paddingBottom: 100 },
    chatItem: { flexDirection: 'row', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    avatarContainer: { marginRight: 12 },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 20, fontWeight: 'bold', color: '#6b7280' },
    content: { flex: 1, justifyContent: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    name: { fontSize: 16, fontWeight: '600', color: '#111827' },
    time: { fontSize: 12, color: '#9ca3af' },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    message: { fontSize: 14, color: '#6b7280', flex: 1, marginRight: 8 },
    badge: { backgroundColor: '#2563EB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    empty: { alignItems: 'center', marginTop: 100, padding: 20 },
    emptyText: { fontSize: 18, color: '#374151', marginTop: 16, fontWeight: '600' },
    subEmptyText: { fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center' },
    fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
});
