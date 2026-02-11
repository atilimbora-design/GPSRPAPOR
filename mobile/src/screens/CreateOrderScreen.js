import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CreateOrderScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [products, setProducts] = useState([]);
    const [quantities, setQuantities] = useState({}); // { productId: qty }
    const [favorites, setFavorites] = useState([]); // Array of product IDs
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);
    const [notes, setNotes] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [hasExistingOrder, setHasExistingOrder] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // 0. Load Local Data First (Instant Load)
            const [favStr, prodStr, orderStr] = await Promise.all([
                AsyncStorage.getItem('favorite_products'),
                AsyncStorage.getItem('cached_products'),
                AsyncStorage.getItem('cached_today_order')
            ]);

            if (favStr) setFavorites(JSON.parse(favStr));

            if (prodStr) {
                setProducts(JSON.parse(prodStr));
                setLoading(false); // Show UI immediately
            }

            if (orderStr) {
                const cachedOrder = JSON.parse(orderStr);
                processOrderData(cachedOrder);
            }

            // 1. Background Sync (Network)
            syncWithServer();

        } catch (error) {
            console.error("Local Load Error:", error);
            setLoading(false);
        }
    };

    const syncWithServer = async () => {
        try {
            // Fetch Products
            const productRes = await api.get('/products');
            const allProducts = productRes.data.products || [];
            setProducts(allProducts);
            await AsyncStorage.setItem('cached_products', JSON.stringify(allProducts));

            // Fetch Today's Order
            const orderRes = await api.get('/orders/today');
            const serverOrder = orderRes.data.order;

            // Only update if no local edits in progress? 
            // For now, server wins to ensure consistency on load
            processOrderData(serverOrder);

            if (serverOrder) {
                await AsyncStorage.setItem('cached_today_order', JSON.stringify(serverOrder));
            } else {
                await AsyncStorage.removeItem('cached_today_order');
            }

        } catch (error) {
            console.log("Sync Error (Offline?):", error.message);
            // Silent fail if offline, user relies on cache
        } finally {
            setLoading(false);
        }
    };

    const processOrderData = (order) => {
        if (!order) return;

        setHasExistingOrder(true);
        setNotes(order.notes || '');
        setIsLocked(order.is_locked);

        // Check 15:00 rule again based on local time
        const now = new Date();
        if (now.getHours() >= 15) setIsLocked(true);

        const newQuantities = {};
        order.items.forEach(item => {
            newQuantities[item.product_id] = item.quantity;
        });
        setQuantities(newQuantities);
    };

    const toggleFavorite = async (id) => {
        let newFavs;
        if (favorites.includes(id)) {
            newFavs = favorites.filter(fid => fid !== id);
        } else {
            newFavs = [...favorites, id];
        }
        setFavorites(newFavs);
        await AsyncStorage.setItem('favorite_products', JSON.stringify(newFavs));
    };

    const handleQuantityChange = (productId, change) => {
        if (isLocked) {
            Alert.alert('Süre Doldu', "Saat 15:00'dan sonra sipariş düzenlenemez.");
            return;
        }

        setQuantities(prev => {
            const current = prev[productId] || 0;
            const next = Math.max(0, current + change);
            if (next === 0) {
                const { [productId]: deleted, ...rest } = prev;
                return rest;
            }
            return { ...prev, [productId]: next };
        });
    };

    const saveOrder = async () => {
        if (Object.keys(quantities).length === 0) {
            Alert.alert('Uyarı', 'Lütfen en az bir ürün seçiniz.');
            return;
        }

        setSaving(true);
        try {
            const items = Object.entries(quantities).map(([pid, qty]) => ({
                product_id: parseInt(pid),
                quantity: qty
            }));

            const res = await api.post('/orders/today', { items, notes });
            if (res.data.success) {
                Alert.alert('Başarılı', 'Siparişiniz kaydedildi.', [
                    { text: 'Tamam', onPress: () => navigation.navigate('Main', { screen: 'Sipariş' }) }
                ]);
            }
        } catch (error) {
            Alert.alert('Hata', error.response?.data?.error || 'Sipariş kaydedilemedi.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert('Emin misiniz?', 'Bugünkü siparişinizi silmek istiyor musunuz? Bu işlem geri alınamaz.', [
            { text: 'Vazgeç', style: 'cancel' },
            {
                text: 'Evet, Sil',
                style: 'destructive',
                onPress: async () => {
                    setSaving(true);
                    try {
                        const res = await api.delete('/orders/today');
                        if (res.data.success) {
                            Alert.alert('Başarılı', 'Siparişiniz silindi.', [
                                { text: 'Tamam', onPress: () => navigation.navigate('Main', { screen: 'Sipariş' }) }
                            ]);
                        }
                    } catch (error) {
                        Alert.alert('Hata', error.response?.data?.error || 'Silme işlemi başarısız.');
                    } finally {
                        setSaving(false);
                    }
                }
            }
        ]);
    };

    const handleManualQuantity = (productId, text) => {
        if (isLocked) return;

        // Allow empty string to clear the input visually (internally 0)
        if (text === '') {
            setQuantities(prev => {
                const { [productId]: deleted, ...rest } = prev;
                return rest;
            });
            return;
        }

        const val = parseInt(text);
        if (isNaN(val) || val < 0) return;

        setQuantities(prev => {
            if (val === 0) {
                const { [productId]: deleted, ...rest } = prev;
                return rest;
            }
            return { ...prev, [productId]: val };
        });
    };

    const filteredProducts = useMemo(() => {
        return products
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                const aFav = favorites.includes(a.id);
                const bFav = favorites.includes(b.id);
                if (aFav && !bFav) return -1;
                if (!aFav && bFav) return 1;
                return (a.sort_order || 999) - (b.sort_order || 999);
            });
    }, [products, searchTerm, favorites]);

    const renderItem = ({ item }) => {
        const qty = quantities[item.id] || 0;
        const isFav = favorites.includes(item.id);

        return (
            <View style={[styles.productItem, qty > 0 && styles.activeItem]}>
                <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.favBtn}>
                    <Ionicons name={isFav ? "heart" : "heart-outline"} size={24} color={isFav ? "#EF4444" : "#9CA3AF"} />
                </TouchableOpacity>

                <View style={styles.productInfo}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productCode}>{item.code}</Text>
                </View>

                <View style={styles.qtyContainer}>
                    <TouchableOpacity
                        style={[styles.qtyBtn, styles.qtyBtnMinus]}
                        onPress={() => handleQuantityChange(item.id, -1)}
                    >
                        <Ionicons name="remove" size={20} color="#EF4444" />
                    </TouchableOpacity>

                    <View style={styles.qtyValueContainer}>
                        <TextInput
                            style={[styles.qtyInput, qty > 0 && styles.activeQtyText]}
                            value={qty > 0 ? qty.toString() : ''}
                            placeholder="0"
                            keyboardType="number-pad"
                            onChangeText={(text) => handleManualQuantity(item.id, text)}
                            maxLength={3}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.qtyBtn, styles.qtyBtnPlus]}
                        onPress={() => handleQuantityChange(item.id, 1)}
                    >
                        <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    const totalCount = Object.values(quantities).reduce((a, b) => a + b, 0);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Sipariş Oluştur (Bugün)</Text>
                {/* Optional: Status Indicator */}
                <View style={{ width: 24 }} />
            </View>

            {/* Locked Warning */}
            {isLocked && (
                <View style={styles.lockedBanner}>
                    <Ionicons name="lock-closed" size={16} color="#B45309" />
                    <Text style={styles.lockedText}>Sipariş saati (15:00) geçtiği için düzenleme yapılamaz.</Text>
                </View>
            )}

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Ürün Ara..."
                    placeholderTextColor="#6B7280"
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                />
            </View>

            {/* Product List */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <FlatList
                    data={filteredProducts}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                />
            </KeyboardAvoidingView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                {/* Notes Input */}
                <TextInput
                    style={styles.notesInput}
                    placeholder="Sipariş Notu (Opsiyonel)"
                    placeholderTextColor="#6B7280"
                    value={notes}
                    onChangeText={t => !isLocked && setNotes(t)}
                    editable={!isLocked}
                />

                <View style={styles.footerRow}>
                    <View>
                        <Text style={styles.totalLabel}>TOPLAM</Text>
                        <Text style={styles.totalValue}>{totalCount} Adet</Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        {/* Delete Button */}
                        {hasExistingOrder && !isLocked && (
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={handleDelete}
                                disabled={saving}
                            >
                                <Ionicons name="trash-outline" size={24} color="white" />
                            </TouchableOpacity>
                        )}

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.saveBtn, (isLocked || totalCount === 0 || saving) && styles.disabledBtn]}
                            onPress={saveOrder}
                            disabled={isLocked || totalCount === 0 || saving}
                        >
                            {saving ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="white" />
                                    <Text style={styles.saveBtnText}>Kaydet</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    backBtn: { padding: 4 },
    lockedBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 10, justifyContent: 'center', gap: 8 },
    lockedText: { color: '#92400E', fontSize: 13, fontWeight: '500' },
    searchContainer: { padding: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    searchInput: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, paddingLeft: 36, fontSize: 15, borderWidth: 1, borderColor: '#E5E7EB', color: '#111827' },
    searchIcon: { position: 'absolute', left: 22, top: 22, zIndex: 1 },
    listContent: { padding: 16, paddingBottom: 100 },
    productItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 6, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    activeItem: { borderColor: '#2563EB', borderWidth: 1, backgroundColor: '#EFF6FF' },
    favBtn: { padding: 10 },
    productInfo: { flex: 1, marginLeft: 4 },
    productName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
    productCode: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    qtyContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 6 },
    qtyBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    qtyBtnMinus: { backgroundColor: '#FEE2E2' },
    qtyBtnPlus: { backgroundColor: '#2563EB' },
    qtyValueContainer: { minWidth: 40, alignItems: 'center' },
    qtyInput: { fontSize: 18, fontWeight: '600', color: '#374151', textAlign: 'center', padding: 0, minWidth: 30 },
    activeQtyText: { color: '#2563EB' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { height: -2 }, shadowOpacity: 0.1, elevation: 10 },
    notesInput: { backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 14, borderWidth: 1, borderColor: '#E5E7EB', color: '#111827' },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 12, color: '#6B7280', fontWeight: 'bold' },
    totalValue: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    saveBtn: { backgroundColor: '#2563EB', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
    deleteBtn: { backgroundColor: '#EF4444', width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
    disabledBtn: { backgroundColor: '#9CA3AF', opacity: 0.7 },
    saveBtnText: { color: 'white', fontWeight: '600', fontSize: 16 },
});
