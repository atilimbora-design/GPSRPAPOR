import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../services/api';

export default function ReportDetailScreen({ route, navigation }) {
    const { report } = route.params;
    const [fullScreenImage, setFullScreenImage] = useState(null);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(amount || 0);
    };

    const totalAmount = (report.cash_amount || 0) +
        (report.credit_card_amount || 0) +
        (report.check_amount || 0) +
        (report.eft_amount || 0);

    const totalExpense = (report.fuel_expense || 0) +
        (report.maintenance_expense || 0) +
        (report.toll_expense || 0);

    const cashDiff = (report.accounting_delivered || 0) - (report.cash_amount || 0);

    const renderImageCard = (title, path) => {
        if (!path) return null;
        // Ensure path uses forward slashes and encode URI components if needed (usually fine)
        const imageUrl = `${API_BASE_URL}/${path.replace(/\\/g, '/')}`;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="image-outline" size={24} color="#06b6d4" />
                    <Text style={styles.cardTitle}>{title}</Text>
                </View>
                <TouchableOpacity onPress={() => setFullScreenImage(imageUrl)}>
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.receiptImage}
                        resizeMode="cover"
                    />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rapor Detayı</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Date Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="calendar-outline" size={24} color="#3b82f6" />
                        <Text style={styles.cardTitle}>Tarih & Saat</Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(report.report_date)}</Text>
                </View>

                {/* User Info */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="person-outline" size={24} color="#10b981" />
                        <Text style={styles.cardTitle}>Personel</Text>
                    </View>
                    <Text style={styles.userText}>{report.full_name || report.user_name || 'Bilinmiyor'}</Text>
                </View>

                {/* Collections (Gelirler) */}
                <View style={[styles.card, styles.totalCard]}>
                    <Text style={styles.totalLabel}>Toplam Tahsilat</Text>
                    <Text style={styles.totalAmount}>{formatCurrency(totalAmount)}</Text>
                </View>

                {/* KM Info */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="speedometer-outline" size={24} color="#f97316" />
                        <Text style={styles.cardTitle}>Araç & KM</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Plaka:</Text>
                        <Text style={styles.infoValue}>{report.vehicle_plate}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Başlangıç KM:</Text>
                        <Text style={styles.infoValue}>{report.start_km}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Bitiş KM:</Text>
                        <Text style={styles.infoValue}>{report.end_km}</Text>
                    </View>
                    <View style={[styles.infoRow, styles.highlightRow]}>
                        <Text style={styles.infoLabelBold}>Yapılan Yol:</Text>
                        <Text style={styles.infoValueBold}>{(report.end_km - report.start_km)} km</Text>
                    </View>
                </View>

                {/* Payment Details */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="wallet-outline" size={24} color="#8b5cf6" />
                        <Text style={styles.cardTitle}>Tahsilat Detayları</Text>
                    </View>
                    <PaymentRow label="Nakit" amount={report.cash_amount} icon="cash-outline" color="#059669" format={formatCurrency} />
                    <PaymentRow label="Kredi Kartı" amount={report.credit_card_amount} icon="card-outline" color="#3b82f6" format={formatCurrency} />
                    <PaymentRow label="Çek" amount={report.check_amount} icon="reader-outline" color="#f59e0b" format={formatCurrency} />
                    <PaymentRow label="EFT" amount={report.eft_amount} icon="swap-horizontal-outline" color="#8b5cf6" format={formatCurrency} />
                </View>

                {/* Expenses (Giderler) */}
                {(totalExpense > 0) && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="construct-outline" size={24} color="#ef4444" />
                            <Text style={styles.cardTitle}>Giderler</Text>
                        </View>
                        <PaymentRow label="Yakıt" amount={report.fuel_expense} icon="water-outline" color="#ef4444" format={formatCurrency} />
                        <PaymentRow label="Bakım" amount={report.maintenance_expense} icon="build-outline" color="#f97316" format={formatCurrency} />
                        <PaymentRow label="HGS/OGS" amount={report.toll_expense} icon="car-outline" color="#6366f1" format={formatCurrency} />

                        <View style={[styles.infoRow, styles.highlightRow, { marginTop: 10 }]}>
                            <Text style={styles.infoLabelBold}>Toplam Gider:</Text>
                            <Text style={[styles.infoValueBold, { color: '#ef4444' }]}>{formatCurrency(totalExpense)}</Text>
                        </View>
                    </View>
                )}

                {/* Accounting Delivery */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="briefcase-outline" size={24} color="#111827" />
                        <Text style={styles.cardTitle}>Muhasebe & Kasa</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Toplam Nakit Satış:</Text>
                        <Text style={styles.infoValue}>{formatCurrency(report.cash_amount)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Teslim Edilen:</Text>
                        <Text style={styles.infoValue}>{formatCurrency(report.accounting_delivered)}</Text>
                    </View>

                    {cashDiff !== 0 && (
                        <View style={[styles.infoRow, styles.highlightRow]}>
                            <Text style={[styles.infoLabelBold, { color: cashDiff >= 0 ? '#059669' : '#DC2626' }]}>
                                {cashDiff >= 0 ? 'Kasa Fazlası:' : 'Kasa Eksiği:'}
                            </Text>
                            <Text style={[styles.infoValueBold, { color: cashDiff >= 0 ? '#059669' : '#DC2626' }]}>
                                {formatCurrency(Math.abs(cashDiff))}
                            </Text>
                        </View>
                    )}

                    {report.cash_difference_reason ? (
                        <View style={{ marginTop: 8 }}>
                            <Text style={[styles.infoLabel, { color: '#DC2626' }]}>Fark Nedeni:</Text>
                            <Text style={styles.notesText}>{report.cash_difference_reason}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Notes */}
                {report.notes && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="document-text-outline" size={24} color="#6b7280" />
                            <Text style={styles.cardTitle}>Notlar</Text>
                        </View>
                        <Text style={styles.notesText}>{report.notes}</Text>
                    </View>
                )}

                {/* Receipt Photos */}
                {renderImageCard("Yakıt Fişi", report.fuel_receipt)}
                {renderImageCard("Bakım Faturası", report.maintenance_receipt)}

            </ScrollView>

            {/* Full Screen Image Modal */}
            <Modal visible={!!fullScreenImage} transparent={true} onRequestClose={() => setFullScreenImage(null)}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setFullScreenImage(null)}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    {fullScreenImage && (
                        <Image source={{ uri: fullScreenImage }} style={styles.fullImage} resizeMode="contain" />
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const PaymentRow = ({ label, amount, icon, color, format }) => {
    if (!amount || amount <= 0) return null;
    return (
        <View style={styles.paymentRow}>
            <View style={styles.paymentLeft}>
                <Ionicons name={icon} size={20} color={color} />
                <Text style={styles.paymentLabel}>{label}</Text>
            </View>
            <Text style={styles.paymentAmount}>{format(amount)}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937' },
    content: { flex: 1, padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginLeft: 8 },
    dateText: { fontSize: 15, color: '#4b5563', marginLeft: 32 },
    userText: { fontSize: 15, color: '#4b5563', fontWeight: '500', marginLeft: 32 },
    totalCard: { backgroundColor: '#3b82f6', alignItems: 'center' },
    totalLabel: { fontSize: 14, color: '#bfdbfe', marginBottom: 4 },
    totalAmount: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
    paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    paymentLeft: { flexDirection: 'row', alignItems: 'center' },
    paymentLabel: { fontSize: 15, color: '#4b5563', marginLeft: 8 },
    paymentAmount: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
    notesText: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
    receiptImage: { width: '100%', height: 200, borderRadius: 8, marginTop: 8 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    infoLabel: { color: '#6b7280', fontSize: 14 },
    infoValue: { color: '#111827', fontSize: 14, fontWeight: '500' },
    highlightRow: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8, marginTop: 4 },
    infoLabelBold: { color: '#1f2937', fontWeight: 'bold', fontSize: 15 },
    infoValueBold: { color: '#3b82f6', fontWeight: 'bold', fontSize: 15 },
    modalContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
    closeButton: { position: 'absolute', top: 40, right: 20, zIndex: 1, padding: 10 },
    fullImage: { width: Dimensions.get('window').width, height: Dimensions.get('window').height }
});
