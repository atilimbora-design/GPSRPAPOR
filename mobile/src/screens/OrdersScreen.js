import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function OrdersScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Detail Modal State
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchOrders(selectedDate);
        });
        fetchOrders(selectedDate);
        return unsubscribe;
    }, [navigation, selectedDate]);

    const fetchOrders = async (date) => {
        setLoading(true);
        try {
            // Backend expects YYYY-MM-DD
            const formattedDate = date.toISOString().split('T')[0];
            // Fetching history for THIS specific date ideally, but getHistory supports range.
            // Using start_date = end_date = formattedDate to get specific day's orders.
            const res = await api.get(`/orders/history`, {
                params: {
                    start_date: formattedDate,
                    end_date: formattedDate
                }
            });

            if (res.data.success) {
                setOrders(res.data.orders);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Hata', 'Sipariş geçmişi alınamadı.');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderDetails = async (orderId) => {
        setDetailLoading(true);
        setModalVisible(true);
        try {
            const res = await api.get(`/orders/${orderId}`);
            if (res.data.success) {
                setSelectedOrder(res.data.order);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Hata', 'Detaylar alınamadı.');
            setModalVisible(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const onDateChange = (event, date) => {
        setShowDatePicker(false);
        if (date) {
            setSelectedDate(date);
            // fetchOrders handled by useEffect dependency
        }
    };

    const renderOrderItem = ({ item }) => {
        const isToday = new Date().toDateString() === new Date(item.order_date).toDateString();
        const canEdit = isToday && new Date().getHours() < 15 && !item.is_locked;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => fetchOrderDetails(item.id)}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.dateText}>{item.order_date}</Text>
                    <View style={[styles.statusBadge, item.is_locked ? styles.statusLocked : styles.statusActive]}>
                        <Text style={[styles.statusText, item.is_locked ? styles.statusTextLocked : styles.statusTextActive]}>
                            {item.is_locked ? 'Kilitli' : 'Aktif'}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Ionicons name="cube-outline" size={18} color="#6B7280" />
                        <Text style={styles.infoText}>{item.total_items} Parça Ürün</Text>
                    </View>
                    {item.notes ? (
                        <View style={styles.infoRow}>
                            <Ionicons name="document-text-outline" size={18} color="#6B7280" />
                            <Text style={styles.infoText} numberOfLines={1}>{item.notes}</Text>
                        </View>
                    ) : null}
                </View>

                {canEdit && (
                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => navigation.navigate('CreateOrder')}
                    >
                        <Ionicons name="create-outline" size={16} color="white" />
                        <Text style={styles.editBtnText}>Düzenle</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.title}>Geçmiş Siparişler</Text>

                <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
                    <Ionicons name="calendar-outline" size={20} color="#2563EB" />
                    <Text style={styles.dateSelectorText}>{selectedDate.toLocaleDateString('tr-TR')}</Text>
                </TouchableOpacity>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    maximumDate={new Date()} // Future dates not needed for history
                />
            )}

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={orders}
                    renderItem={renderOrderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="cart-outline" size={48} color="#D1D5DB" />
                            <Text style={styles.emptyText}>Bu tarihte sipariş bulunamadı.</Text>
                            {new Date().toDateString() === selectedDate.toDateString() && (
                                <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateOrder')}>
                                    <Text style={styles.createBtnText}>Sipariş Oluştur</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            )}

            {/* Detail Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sipariş Detayı</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#111827" />
                            </TouchableOpacity>
                        </View>

                        {detailLoading || !selectedOrder ? (
                            <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
                        ) : (
                            <View style={{ flex: 1 }}>
                                <View style={styles.modalInfo}>
                                    <Text style={styles.modalLabel}>Tarih: <Text style={styles.modalValue}>{selectedOrder.order_date}</Text></Text>
                                    <Text style={styles.modalLabel}>Toplam: <Text style={styles.modalValue}>{selectedOrder.total_items} Adet</Text></Text>
                                    {selectedOrder.notes && <Text style={[styles.modalLabel, { marginTop: 4 }]}>Not: <Text style={styles.modalValue}>{selectedOrder.notes}</Text></Text>}
                                </View>

                                <FlatList
                                    data={selectedOrder.items}
                                    keyExtractor={item => item.id.toString()}
                                    renderItem={({ item }) => (
                                        <View style={styles.detailItem}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.detailName}>{item.product_name}</Text>
                                                <Text style={styles.detailCode}>{item.product_code}</Text>
                                            </View>
                                            <Text style={styles.detailQty}>{item.quantity} {item.unit || 'Adet'}</Text>
                                        </View>
                                    )}
                                    contentContainerStyle={{ padding: 16 }}
                                />
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 8, borderRadius: 8, gap: 8 },
    dateSelectorText: { color: '#2563EB', fontWeight: 'bold' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16 },
    card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    dateText: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    statusActive: { backgroundColor: '#D1FAE5' },
    statusLocked: { backgroundColor: '#F3F4F6' },
    statusText: { fontSize: 12, fontWeight: 'bold' },
    statusTextActive: { color: '#065F46' },
    statusTextLocked: { color: '#374151' },
    cardBody: { gap: 4 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { color: '#4B5563', fontSize: 14 },
    editBtn: { backgroundColor: '#2563EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 8, marginTop: 12, gap: 4 },
    editBtnText: { color: 'white', fontWeight: '600' },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#9CA3AF', marginTop: 12, marginBottom: 20 },
    createBtn: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    createBtnText: { color: 'white', fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    modalInfo: { padding: 16, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    modalLabel: { color: '#6B7280', fontSize: 14 },
    modalValue: { color: '#111827', fontWeight: '600' },
    detailItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    detailName: { fontSize: 15, fontWeight: '500', color: '#1F2937' },
    detailCode: { fontSize: 12, color: '#9CA3AF' },
    detailQty: { fontSize: 15, fontWeight: 'bold', color: '#2563EB' },
});
