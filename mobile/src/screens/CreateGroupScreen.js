import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateGroupScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [groupName, setGroupName] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
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

    const toggleSelection = (id) => {
        if (selectedUsers.includes(id)) {
            setSelectedUsers(prev => prev.filter(uid => uid !== id));
        } else {
            setSelectedUsers(prev => [...prev, id]);
        }
    };

    const handleCreate = async () => {
        if (!groupName.trim()) {
            Alert.alert('Hata', 'Lütfen grup adı giriniz.');
            return;
        }
        if (selectedUsers.length === 0) {
            Alert.alert('Hata', 'Lütfen en az bir üye seçiniz.');
            return;
        }

        setCreating(true);
        try {
            const formData = new FormData();
            formData.append('name', groupName);
            formData.append('member_ids', JSON.stringify(selectedUsers));

            const res = await api.post('/groups', formData);
            if (res.data.success) {
                Alert.alert('Başarılı', 'Grup oluşturuldu.');
                navigation.navigate('ChatDetail', {
                    targetId: res.data.group.id,
                    targetName: res.data.group.name,
                    type: 'group'
                });
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Hata', 'Grup oluşturulamadı.');
        } finally {
            setCreating(false);
        }
    };

    const renderItem = ({ item }) => {
        const isSelected = selectedUsers.includes(item.id);
        return (
            <TouchableOpacity onPress={() => toggleSelection(item.id)} style={[styles.userItem, isSelected && styles.selectedItem]}>
                <View style={[styles.checkbox, isSelected && styles.checked]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
                <Text style={styles.userName}>{item.full_name}</Text>
                <Text style={styles.userRole}>{item.role}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.title}>Yeni Grup</Text>
                <TouchableOpacity onPress={handleCreate} disabled={creating}>
                    {creating ? <ActivityIndicator color="#2563EB" /> : <Text style={styles.createBtn}>Oluştur</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Grup Adı</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Grup adı..."
                    value={groupName}
                    onChangeText={setGroupName}
                />
            </View>

            <Text style={styles.sectionTitle}>Üyeler ({selectedUsers.length})</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    title: { fontSize: 18, fontWeight: 'bold' },
    createBtn: { fontSize: 16, color: '#2563EB', fontWeight: 'bold' },
    inputContainer: { padding: 16, borderBottomWidth: 8, borderBottomColor: '#f9fafb' },
    label: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
    input: { fontSize: 16, borderBottomWidth: 1, borderBottomColor: '#d1d5db', paddingVertical: 8 },
    sectionTitle: { padding: 16, fontSize: 14, fontWeight: 'bold', color: '#6b7280', backgroundColor: '#f9fafb' },
    list: { padding: 16 },
    userItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    selectedItem: { backgroundColor: '#eff6ff' },
    checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#d1d5db', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
    checked: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
    userName: { flex: 1, fontSize: 16, color: '#1f2937' },
    userRole: { fontSize: 12, color: '#9ca3af', textTransform: 'capitalize' }
});
