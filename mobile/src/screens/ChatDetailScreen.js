import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatDetailScreen({ route, navigation }) {
    const { targetId, targetName, type, photo } = route.params;
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const flatListRef = useRef();
    const socketRef = useRef(null);

    const fetchMessages = async () => {
        try {
            const url = type === 'direct'
                ? `/messages/direct/${targetId}`
                : `/messages/group/${targetId}`;

            const res = await api.get(url);
            if (res.data.success) {
                setMessages(res.data.messages);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchMessages();

        // ✅ Socket Setup for Real-Time Messages
        const setupSocket = async () => {
            const token = await AsyncStorage.getItem('token');
            const socket = io('http://192.168.1.104:5000', {
                auth: { token },
                query: { userId: user.id }
            });

            socketRef.current = socket;

            // Listen for NEW MESSAGES
            if (type === 'group') {
                socket.on('new_group_message', (data) => {
                    console.log('📩 New group message received:', data);
                    if (data.group_id === targetId) {
                        setMessages(prev => [data, ...prev]);
                        setTimeout(() => flatListRef.current?.scrollToIndex({ index: 0, animated: true }), 100);
                    }
                });
            } else {
                socket.on('new_message', (data) => {
                    console.log('📩 New direct message received:', data);
                    if (data.sender_id === targetId || data.receiver_id === targetId) {
                        setMessages(prev => [data, ...prev]);
                        setTimeout(() => flatListRef.current?.scrollToIndex({ index: 0, animated: true }), 100);
                    }
                });
            }

            // Listen for DELETED MESSAGES
            socket.on('message_deleted', (data) => {
                setMessages(prev => prev.filter(m => m.id !== data.id));
            });
        };

        setupSocket();

        // Cleanup
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [targetId, type]);

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const content = inputText;
        setInputText('');
        setSending(true);

        try {
            const formData = new FormData();
            formData.append('content', content);
            formData.append('message_type', 'text');
            if (type === 'direct') formData.append('receiver_id', targetId);
            else formData.append('group_id', targetId);

            const res = await api.post('/messages/send', formData);
            if (res.data.success) {
                fetchMessages();
            }
        } catch (error) {
            console.error(error);
            alert('Mesaj gönderilemedi.');
            setInputText(content);
        } finally {
            setSending(false);
        }
    };

    const deleteMessage = async (msgId) => {
        try {
            await api.delete(`/messages/${msgId}`);
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (error) {
            Alert.alert('Hata', 'Mesaj silinemedi.');
        }
    };

    const handleLongPress = (item) => {
        if (!item.is_mine) return;

        Alert.alert(
            'Mesajı Sil',
            'Bu mesajı silmek istiyor musunuz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: () => deleteMessage(item.id)
                }
            ]
        );
    };

    const renderMessage = ({ item }) => {
        const isMine = item.is_mine;
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onLongPress={() => handleLongPress(item)}
                style={[styles.msgContainer, isMine ? styles.msgRight : styles.msgLeft]}
            >
                {!isMine && type === 'group' && <Text style={styles.senderName}>{item.sender_name}</Text>}

                <View style={[styles.bubble, isMine ? styles.bubbleRight : styles.bubbleLeft]}>
                    {item.message_type === 'image' ? (
                        <Image source={{ uri: `${API_BASE_URL}/${item.content}` }} style={styles.msgImage} />
                    ) : (
                        <Text style={[styles.msgText, isMine ? styles.msgTextRight : styles.msgTextLeft]}>{item.content}</Text>
                    )}
                    <Text style={[styles.msgTime, isMine ? styles.msgTimeRight : styles.msgTimeLeft]}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.titleContainer}
                        onPress={() => navigation.navigate('ChatInfo', { targetId, targetName, type, photo })}
                    >
                        <Text style={styles.headerTitle}>{targetName}</Text>
                        {type === 'group' && <Text style={styles.subTitle}>Grup Bilgisi için dokun</Text>}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={() => navigation.navigate('ChatInfo', { targetId, targetName, type, photo })}
                    style={styles.headerRightBtn}
                >
                    <Ionicons name="ellipsis-vertical" size={22} color="#111827" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id.toString()}
                    inverted
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                />

                <View style={[styles.inputContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
                    <TextInput
                        style={styles.input}
                        placeholder="Mesaj yazın..."
                        placeholderTextColor="#9ca3af"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={sending}>
                        {sending ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="send" size={20} color="white" />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#e5ddd5' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', zIndex: 10 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { padding: 4 },
    titleContainer: { marginLeft: 12 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    subTitle: { fontSize: 12, color: '#6b7280' },
    headerRightBtn: { padding: 8 },
    keyboardView: { flex: 1 },
    listContent: { padding: 16 },
    msgContainer: { marginBottom: 12, width: '100%' },
    msgLeft: { alignItems: 'flex-start' },
    msgRight: { alignItems: 'flex-end' },
    senderName: { fontSize: 11, color: '#d97706', marginBottom: 2, marginLeft: 8 },
    bubble: { maxWidth: '80%', padding: 10, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 1 },
    bubbleLeft: { backgroundColor: 'white', borderTopLeftRadius: 0 },
    bubbleRight: { backgroundColor: '#dcf8c6', borderTopRightRadius: 0 },
    msgText: { fontSize: 16, marginBottom: 4 },
    msgTextLeft: { color: '#1f2937' },
    msgTextRight: { color: '#064e3b' },
    msgImage: { width: 200, height: 200, borderRadius: 8, marginBottom: 4 },
    msgTime: { fontSize: 10, alignSelf: 'flex-end' },
    msgTimeLeft: { color: '#9ca3af' },
    msgTimeRight: { color: '#065f46' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
    input: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100, color: '#1f2937', marginRight: 10 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' },
});
