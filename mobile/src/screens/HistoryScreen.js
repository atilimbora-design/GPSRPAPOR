import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';

export default function HistoryScreen({ navigation }) {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7))); // Last 7 days
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const s = startDate.toISOString().split('T')[0];
            const e = endDate.toISOString().split('T')[0];
            const res = await api.get(`/reports/history?start_date=${s}&end_date=${e}`);
            if (res.data.success) {
                setReports(res.data.reports);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [startDate, endDate]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchHistory();
    };

    const handleDateChange = (type, event, selectedDate) => {
        if (type === 'start') {
            setShowStartPicker(Platform.OS === 'ios');
            if (selectedDate) setStartDate(selectedDate);
        } else {
            setShowEndPicker(Platform.OS === 'ios');
            if (selectedDate) setEndDate(selectedDate);
        }
    };

    const renderItem = ({ item }) => {
        const total = (item.cash_amount || 0) + (item.credit_card_amount || 0) + (item.check_amount || 0) + (item.eft_amount || 0);
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.date}>{item.report_date.split('-').reverse().join('.')}</Text>
                    <Text style={styles.plate}>{item.vehicle_plate}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Toplam Tahsilat:</Text>
                    <Text style={styles.value}>{total.toFixed(2)} TL</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Yol:</Text>
                    <Text style={styles.value}>{item.end_km - item.start_km} km</Text>
                </View>

                {item.accounting_delivered > 0 && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Teslim Edilen:</Text>
                        <Text style={[styles.value, { color: 'green' }]}>{item.accounting_delivered.toFixed(2)} TL</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Geçmiş Raporlar</Text>
            </View>

            {/* Filter Section */}
            <View style={styles.filterContainer}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                    <Ionicons name="calendar-outline" size={16} color="#374151" />
                    <Text style={styles.dateText}>{startDate.toLocaleDateString('tr-TR')}</Text>
                </TouchableOpacity>
                <Ionicons name="arrow-forward" size={16} color="#9ca3af" />
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                    <Ionicons name="calendar-outline" size={16} color="#374151" />
                    <Text style={styles.dateText}>{endDate.toLocaleDateString('tr-TR')}</Text>
                </TouchableOpacity>
            </View>

            {showStartPicker && (
                <DateTimePicker
                    value={startDate}
                    mode="date"
                    onChange={(e, d) => handleDateChange('start', e, d)}
                />
            )}
            {showEndPicker && (
                <DateTimePicker
                    value={endDate}
                    mode="date"
                    onChange={(e, d) => handleDateChange('end', e, d)}
                />
            )}

            <FlatList
                data={reports}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.empty}>
                            <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
                            <Text style={styles.emptyText}>Bu tarih aralığında rapor bulunamadı.</Text>
                        </View>
                    )
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    filterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12, backgroundColor: 'white', marginBottom: 1 },
    dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 },
    dateText: { fontSize: 13, color: '#374151', fontWeight: '500' },
    list: { padding: 16 },
    card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 8 },
    date: { fontWeight: 'bold', color: '#111827', fontSize: 16 },
    plate: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#6b7280', fontSize: 14, backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    label: { color: '#6b7280', fontSize: 14 },
    value: { fontWeight: '600', color: '#111827', fontSize: 14 },
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
    emptyText: { marginTop: 10, color: '#9ca3af' }
});
