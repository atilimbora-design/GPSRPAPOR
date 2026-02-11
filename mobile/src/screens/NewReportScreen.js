import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function NewReportScreen({ navigation }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Date State
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [formData, setFormData] = useState({
        vehicle_plate: '',
        start_km: '',
        end_km: '',
        fuel_expense: '',
        maintenance_expense: '',
        maintenance_description: '',
        toll_expense: '',
        credit_card_amount: '',
        check_amount: '',
        eft_amount: '',
        cash_amount: '',
        accounting_delivered: '',
        cash_difference_reason: ''
    });

    const [images, setImages] = useState({
        fuel_receipt: null,
        maintenance_receipt: null
    });

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
    };

    const formatDate = (date) => {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    const handleInputChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const pickImage = async (field) => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert("İzin Gerekli", "Kamera izni vermeniz gerekiyor. Ayarlardan izin verin.");
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: 'images', // Use string literal to avoid enum issues
                quality: 0.5,
                allowsEditing: true,
            });

            if (!result.canceled) {
                setImages(prev => ({ ...prev, [field]: result.assets[0] }));
            }
        } catch (error) {
            console.error("Image Picker Error:", error);
            Alert.alert("Hata", "Resim seçilirken hata: " + (error.message || error));
        }
    };

    const calculateTotalCollection = () => {
        const cash = parseFloat(formData.cash_amount || 0);
        const cc = parseFloat(formData.credit_card_amount || 0);
        const check = parseFloat(formData.check_amount || 0);
        const eft = parseFloat(formData.eft_amount || 0);
        return (cash + cc + check + eft).toFixed(2);
    };

    const handleSubmit = async () => {
        if (!formData.vehicle_plate || !formData.start_km || !formData.end_km) {
            Alert.alert('Hata', 'Lütfen plaka ve km bilgilerini girin.');
            return;
        }

        if (parseInt(formData.end_km) <= parseInt(formData.start_km)) {
            Alert.alert('Hata', 'Bitiş KM, Başlangıç KM\'den büyük olmalıdır.');
            return;
        }

        setLoading(true);
        setUploadProgress(0);

        try {
            const data = new FormData();

            // Date
            data.append('report_date', formatDate(date));

            // Texts
            data.append('vehicle_plate', formData.vehicle_plate);
            data.append('start_km', formData.start_km);
            data.append('end_km', formData.end_km);
            data.append('fuel_expense', formData.fuel_expense || '0');
            data.append('maintenance_expense', formData.maintenance_expense || '0');
            data.append('maintenance_description', formData.maintenance_description || '');
            data.append('toll_expense', formData.toll_expense || '0');
            data.append('credit_card_amount', formData.credit_card_amount || '0');
            data.append('check_amount', formData.check_amount || '0');
            data.append('eft_amount', formData.eft_amount || '0');
            data.append('cash_amount', formData.cash_amount || '0');
            data.append('accounting_delivered', formData.accounting_delivered || '0');
            data.append('cash_difference_reason', formData.cash_difference_reason || '');

            // Images
            if (images.fuel_receipt) {
                const uri = Platform.OS === 'android' ? images.fuel_receipt.uri : images.fuel_receipt.uri.replace('file://', '');
                const filename = uri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? 'image/' + match[1] : 'image/jpeg';

                data.append('fuel_receipt', {
                    uri: uri,
                    name: filename || 'fuel.jpg',
                    type: type,
                });
            }

            if (images.maintenance_receipt) {
                const uri = Platform.OS === 'android' ? images.maintenance_receipt.uri : images.maintenance_receipt.uri.replace('file://', '');
                const filename = uri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? 'image/' + match[1] : 'image/jpeg';

                data.append('maintenance_receipt', {
                    uri: uri,
                    name: filename || 'maint.jpg',
                    type: type,
                });
            }

            console.log('Sending Report Data to /reports ...');

            const res = await api.post('/reports', data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            if (res.data.success) {
                Alert.alert('Başarılı', 'Rapor başarıyla gönderildi.', [
                    { text: 'Tamam', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error) {
            console.error('Upload Error:', error);
            const msg = error.response?.data?.error || 'Rapor gönderilemedi.';
            Alert.alert('Hata', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {/* Back Button added */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Günlük Rapor</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

                {/* Tarih Seçimi */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Rapor Tarihi</Text>
                    <TouchableOpacity
                        style={styles.dateBtn}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={20} color="#374151" />
                        <Text style={styles.dateText}>
                            {date.toLocaleDateString('tr-TR')}
                        </Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            testID="dateTimePicker"
                            value={date}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                            maximumDate={new Date()}
                        />
                    )}
                </View>

                {/* Araç Bilgileri */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Araç Bilgileri</Text>
                    <Text style={styles.label}>Araç Plakası</Text>
                    <TextInput
                        style={styles.input} placeholderTextColor="#9ca3af"
                        placeholder="Plaka (Örn: 34ABC123)"
                        value={formData.vehicle_plate}
                        onChangeText={t => handleInputChange('vehicle_plate', t)}
                        autoCapitalize="characters"
                    />
                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Başlangıç KM</Text>
                            <TextInput
                                style={styles.input} placeholderTextColor="#9ca3af"
                                placeholder="0"
                                keyboardType="numeric"
                                value={formData.start_km}
                                onChangeText={t => handleInputChange('start_km', t)}
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Bitiş KM</Text>
                            <TextInput
                                style={styles.input} placeholderTextColor="#9ca3af"
                                placeholder="0"
                                keyboardType="numeric"
                                value={formData.end_km}
                                onChangeText={t => handleInputChange('end_km', t)}
                            />
                        </View>
                    </View>
                </View>

                {/* Tahsilat */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tahsilat</Text>

                    <Text style={styles.label}>Nakit Tahsilat (TL)</Text>
                    <TextInput
                        style={styles.input} placeholderTextColor="#9ca3af"
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={formData.cash_amount}
                        onChangeText={t => handleInputChange('cash_amount', t)}
                    />

                    <Text style={styles.label}>Kredi Kartı (TL)</Text>
                    <TextInput
                        style={styles.input} placeholderTextColor="#9ca3af"
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={formData.credit_card_amount}
                        onChangeText={t => handleInputChange('credit_card_amount', t)}
                    />

                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Çek (TL)</Text>
                            <TextInput
                                style={styles.input} placeholderTextColor="#9ca3af"
                                placeholder="0.00"
                                keyboardType="numeric"
                                value={formData.check_amount}
                                onChangeText={t => handleInputChange('check_amount', t)}
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>EFT/Havale (TL)</Text>
                            <TextInput
                                style={styles.input} placeholderTextColor="#9ca3af"
                                placeholder="0.00"
                                keyboardType="numeric"
                                value={formData.eft_amount}
                                onChangeText={t => handleInputChange('eft_amount', t)}
                            />
                        </View>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryText}>Toplam Tahsilat: {calculateTotalCollection()} TL</Text>
                    </View>
                </View>

                {/* Muhasebe Teslim */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Muhasebe</Text>
                    <Text style={styles.infoText}>Muhasebeye elden ne kadar nakit teslim ettiniz?</Text>

                    <Text style={styles.label}>Teslim Edilen Nakit (TL)</Text>
                    <TextInput
                        style={styles.input} placeholderTextColor="#9ca3af"
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={formData.accounting_delivered}
                        onChangeText={t => handleInputChange('accounting_delivered', t)}
                    />

                    {(() => {
                        const cash = parseFloat(formData.cash_amount) || 0;
                        const delivered = parseFloat(formData.accounting_delivered) || 0;
                        const diff = delivered - cash;

                        if (formData.accounting_delivered && diff !== 0) {
                            return (
                                <View style={{ marginBottom: 12 }}>
                                    <View style={[styles.diffBox, { backgroundColor: diff > 0 ? '#dcfce7' : '#fee2e2' }]}>
                                        <Text style={[styles.diffText, { color: diff > 0 ? '#166534' : '#991b1b' }]}>
                                            Fark: {diff > 0 ? '+' : ''}{diff.toFixed(2)} TL
                                        </Text>
                                    </View>
                                    <Text style={styles.label}>Fark Nedeni</Text>
                                    <TextInput
                                        style={styles.input} placeholderTextColor="#9ca3af"
                                        placeholder="Kasa farkı varsa nedeni..."
                                        value={formData.cash_difference_reason}
                                        onChangeText={t => handleInputChange('cash_difference_reason', t)}
                                    />
                                </View>
                            );
                        }
                        return null;
                    })()}
                </View>

                {/* Giderler */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Giderler</Text>

                    {/* Fuel */}
                    <Text style={styles.label}>Yakıt Tutarı (TL)</Text>
                    <View style={styles.expenseRow}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholderTextColor="#9ca3af"
                            placeholder="0.00"
                            keyboardType="numeric"
                            value={formData.fuel_expense}
                            onChangeText={t => handleInputChange('fuel_expense', t)}
                        />
                        <TouchableOpacity style={styles.cameraBtn} onPress={() => pickImage('fuel_receipt')}>
                            <Ionicons name={images.fuel_receipt ? "checkmark-circle" : "camera"} size={24} color={images.fuel_receipt ? "green" : "gray"} />
                        </TouchableOpacity>
                    </View>

                    {/* Maintenance */}
                    <Text style={styles.label}>Bakım Tutarı (TL)</Text>
                    <View style={styles.expenseRow}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholderTextColor="#9ca3af"
                            placeholder="0.00"
                            keyboardType="numeric"
                            value={formData.maintenance_expense}
                            onChangeText={t => handleInputChange('maintenance_expense', t)}
                        />
                        <TouchableOpacity style={styles.cameraBtn} onPress={() => pickImage('maintenance_receipt')}>
                            <Ionicons name={images.maintenance_receipt ? "checkmark-circle" : "camera"} size={24} color={images.maintenance_receipt ? "green" : "gray"} />
                        </TouchableOpacity>
                    </View>
                    {formData.maintenance_expense ? (
                        <>
                            <Text style={styles.label}>Bakım Açıklaması</Text>
                            <TextInput
                                style={[styles.input, { marginTop: 4 }]} placeholderTextColor="#9ca3af"
                                placeholder="Bakım Açıklaması"
                                value={formData.maintenance_description}
                                onChangeText={t => handleInputChange('maintenance_description', t)}
                            />
                        </>
                    ) : null}

                    {/* Toll */}
                    <Text style={styles.label}>HGS/OGS/Otoban (TL)</Text>
                    <TextInput
                        style={styles.input} placeholderTextColor="#9ca3af"
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={formData.toll_expense}
                        onChangeText={t => handleInputChange('toll_expense', t)}
                    />
                </View>

                {/* SUBMIT BUTTON */}
                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.disabledBtn]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ActivityIndicator color="white" style={{ marginRight: 10 }} />
                            <Text style={styles.submitBtnText}>{uploadProgress}% Yükleniyor...</Text>
                        </View>
                    ) : (
                        <Text style={styles.submitBtnText}>Raporu Gönder</Text>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    content: { padding: 16 },
    section: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
    infoText: { fontSize: 12, color: 'gray', marginBottom: 8 },
    input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, color: '#1f2937' },
    label: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 6, marginLeft: 2 },
    row: { flexDirection: 'row', gap: 12 },
    halfInput: { flex: 1 },
    summaryBox: { backgroundColor: '#eff6ff', padding: 12, borderRadius: 8, marginTop: -4 },
    summaryText: { color: '#1e40af', fontWeight: 'bold', textAlign: 'center' },
    diffBox: { padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: 'transparent' },
    diffText: { fontWeight: 'bold', textAlign: 'center' },
    expenseRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
    cameraBtn: { width: 50, height: 50, backgroundColor: '#f3f4f6', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
    submitBtn: { backgroundColor: '#2563EB', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
    disabledBtn: { backgroundColor: '#93c5fd' },
    submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    dateBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 },
    dateText: { marginLeft: 10, fontSize: 16, color: '#1f2937' }
});
