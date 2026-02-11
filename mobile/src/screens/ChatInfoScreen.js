import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, FlatList, Alert, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function ChatInfoScreen({ route, navigation }) {
    const { targetId, targetName, type, photo } = route.params;
    const insets = useSafeAreaInsets();
    const [mediaMessages, setMediaMessages] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Messages for Media
                const msgUrl = type === 'direct'
                    ? `/messages/direct/${targetId}`
                    : `/messages/group/${targetId}`;
                const msgRes = await api.get(msgUrl);
                if (msgRes.data.success) {
                    const medias = msgRes.data.messages.filter(m => m.message_type === 'image');
                    setMediaMessages(medias);
                }

                // 2. Fetch Group Details if Group
                if (type === 'group') {
                    const groupRes = await api.get(`/groups/${targetId}`);
                    if (groupRes.data.success) {
                        setMembers(groupRes.data.group.members);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const clearChat = async () => {
        Alert.alert(
            'Sohbeti Temizle',
            'Tüm mesaj geçmişi silinecek. Emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Temizle',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.post('/messages/clear', { targetId, type });
                            Alert.alert('Başarılı', 'Sohbet temizlendi.');
                            navigation.pop(2); // Go back to List
                        } catch (error) {
                            Alert.alert('Hata', 'Sohbet temizlenemedi.');
                        }
                    }
                }
            ]
        );
    };

    const leaveGroup = async () => {
        Alert.alert(
            'Gruptan Ayrıl',
            'Bu gruptan çıkmak istediğinize emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Ayrıl',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await api.post(`/groups/${targetId}/leave`);
                            if (res.data.success) {
                                Alert.alert('Ayrıldınız', 'Gruptan başarıyla ayrıldınız.');
                                navigation.pop(2); // Chat listesine dön
                            }
                        } catch (e) { Alert.alert('Hata', 'Gruptan çıkılamadı.'); }
                    }
                }
            ]
        );
    };

    const renderMediaItem = ({ item }) => (
        <TouchableOpacity
            style={styles.mediaItem}
            onPress={() => setSelectedImage(item.content)}
        >
            <Image source={{ uri: `${API_BASE_URL}/${item.content}` }} style={styles.mediaImage} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{type === 'group' ? 'Grup Bilgisi' : 'Kişi Bilgisi'}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.profileImageContainer}>
                        {photo
                            ? <Image source={{ uri: `${API_BASE_URL}/${photo}` }} style={styles.profileImage} />
                            : <View style={[styles.profileImage, styles.placeholder]}><Text style={styles.placeholderText}>{targetName[0]}</Text></View>
                        }
                    </View>
                    <Text style={styles.profileName}>{targetName}</Text>
                    <Text style={styles.profileDetail}>{type === 'group' ? 'Grup' : 'Kişi'}</Text>
                </View>

                {/* Media Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Medya ({mediaMessages.length})</Text>
                    {mediaMessages.length > 0 ? (
                        <FlatList
                            data={mediaMessages}
                            renderItem={renderMediaItem}
                            keyExtractor={item => item.id.toString()}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.mediaList}
                        />
                    ) : (
                        <Text style={styles.emptyText}>Medya yok</Text>
                    )}
                </View>

                {/* Group Members Section */}
                {type === 'group' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Grup Üyeleri ({members.length})</Text>
                        {members.map(m => (
                            <View key={m.user_id} style={styles.memberItem}>
                                <View style={styles.memberAvatar}>
                                    {m.profile_photo
                                        ? <Image source={{ uri: `${API_BASE_URL}/${m.profile_photo}` }} style={styles.memberImg} />
                                        : <Text style={styles.memberInitial}>{m.full_name[0]}</Text>
                                    }
                                </View>
                                <View>
                                    <Text style={styles.memberName}>{m.full_name}</Text>
                                    <Text style={styles.memberRole}>{m.role === 'admin' ? 'Yönetici' : 'Üye'}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Actions */}
                <View style={[styles.section, { borderBottomWidth: 0 }]}>
                    <TouchableOpacity style={styles.actionBtn} onPress={clearChat}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        <Text style={styles.actionTextRed}>Sohbeti Temizle</Text>
                    </TouchableOpacity>

                    {type === 'group' && (
                        <TouchableOpacity style={[styles.actionBtn, { marginTop: 16 }]} onPress={leaveGroup}>
                            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                            <Text style={styles.actionTextRed}>Gruptan Ayrıl</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* Full Screen Image Modal */}
            {selectedImage && (
                <Modal visible={true} transparent={true} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
                    <View style={styles.fullScreenModal}>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedImage(null)}>
                            <Ionicons name="close" size={30} color="white" />
                        </TouchableOpacity>
                        <Image
                            source={{ uri: `${API_BASE_URL}/${selectedImage}` }}
                            style={styles.fullScreenImage}
                            resizeMode="contain"
                        />
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    scrollContent: { paddingBottom: 40 },
    profileSection: { alignItems: 'center', padding: 24, backgroundColor: 'white', marginBottom: 12 },
    profileImageContainer: { width: 100, height: 100, borderRadius: 50, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    profileImage: { width: 100, height: 100, borderRadius: 50 },
    placeholder: { backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
    placeholderText: { fontSize: 40, fontWeight: 'bold', color: '#6b7280' },
    profileName: { fontSize: 22, fontWeight: 'bold', color: '#111827', textAlign: 'center' },
    profileDetail: { fontSize: 14, color: '#6b7280', marginTop: 4 },
    section: { backgroundColor: 'white', padding: 16, marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
    mediaList: { paddingRight: 16 },
    mediaItem: { marginRight: 8 },
    mediaImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#e5e7eb' },
    emptyText: { color: '#9ca3af', fontStyle: 'italic' },
    memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
    memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    memberImg: { width: 40, height: 40, borderRadius: 20 },
    memberInitial: { fontSize: 16, fontWeight: 'bold', color: '#6b7280' },
    memberName: { fontSize: 15, fontWeight: '500', color: '#1f2937' },
    memberRole: { fontSize: 12, color: '#9ca3af' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    actionTextRed: { fontSize: 16, color: '#EF4444', marginLeft: 8, fontWeight: '500' },
    fullScreenModal: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
    fullScreenImage: { width: width, height: height },
    closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
});
