import { useEffect, useState } from 'react';
import api from '../services/api';
import { Download, Search, Calendar, ChevronDown, Package, FileSpreadsheet, Eye } from 'lucide-react';
import Modal from '../components/Modal';
import io from 'socket.io-client';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedOrder, setSelectedOrder] = useState(null); // For Detail Modal

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/orders/all?date=${selectedDate}`);
            if (res.data.success) {
                setOrders(res.data.orders);
            }
        } catch (err) {
            console.error(err);
            alert(`Sipariş listesi alınamadı: ${err.message}`);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchOrders();

        const token = localStorage.getItem('token');
        const socket = io('https://takip.atilimgida.com', {
            auth: { token },
            query: { userRole: 'admin' }
        });

        socket.on('order_update', (data) => {
            // Refresh if date matches OR simplify to always refresh current view
            fetchOrders();
        });

        return () => socket.disconnect();
    }, [selectedDate]);

    const handleDownloadExcel = async () => {
        try {
            const res = await api.get(`/orders/export/excel?date=${selectedDate}`, {
                responseType: 'blob', // Important for file download
            });

            // Create Blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `siparisler_${selectedDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Excel indirilemedi.');
        }
    };

    // Calculate daily totals locally for quick view (Top Cards)
    const totalOrders = orders.length;
    const totalItems = orders.reduce((sum, o) => {
        const orderTotal = o.items ? o.items.reduce((s, i) => s + (i.quantity || 0), 0) : (o.total_items || 0);
        return sum + orderTotal;
    }, 0);
    const completedOrders = orders.filter(o => o.is_locked).length;

    // Helper for Initials
    const getInitials = (name) => {
        if (!name) return '';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <div>
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Sipariş Yönetimi</h1>
                    <p className="text-sm text-gray-500">Günlük siparişleri görüntüle ve Excel olarak indir.</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {/* Date Picker */}
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
                        />
                    </div>

                    {/* Export Button */}
                    <button
                        onClick={handleDownloadExcel}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition"
                    >
                        <FileSpreadsheet size={18} />
                        <span>Excel İndir</span>
                    </button>
                </div>
            </div>

            {/* Warning if date is not today */}
            {selectedDate !== new Date().toISOString().split('T')[0] && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-2 mb-6">
                    <Calendar size={20} />
                    <span><b>{new Date(selectedDate).toLocaleDateString('tr-TR')}</b> tarihli geçmiş siparişleri görüntülüyorsunuz.</span>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-gray-500 text-sm font-medium">Toplam Sipariş Veren</div>
                    <div className="text-2xl font-bold text-blue-600">{totalOrders} Kişi</div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-gray-500 text-sm font-medium">Toplam Koli</div>
                    <div className="text-2xl font-bold text-indigo-600">{totalItems} Koli</div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-gray-500 text-sm font-medium">Onay Durumu</div>
                    <div className="text-2xl font-bold text-gray-700">{completedOrders} / {totalOrders}</div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Personel</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Sipariş Saati</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500 text-center">Toplam Ürün</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Notlar</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500 text-right">Detay</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setSelectedOrder(order)}>
                                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                                            {getInitials(order.full_name)}
                                        </div>
                                        {order.full_name}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {/* Using created_at or updated_at, assuming format compatible */}
                                        {new Date(order.updated_at || order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-bold text-sm">
                                            {order.items ? order.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : order.total_items}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm max-w-xs truncate">
                                        {order.notes || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-gray-400 hover:text-blue-600">
                                            <Eye size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {orders.length === 0 && !loading && (
                    <div className="p-12 text-center text-gray-400">
                        <Package size={48} className="mx-auto mb-3 opacity-20" />
                        <p>Bu tarihte henüz hiç sipariş yok.</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedOrder && (
                <Modal title={`Sipariş Detayı: ${selectedOrder.full_name}`} onClose={() => setSelectedOrder(null)}>
                    <div className="space-y-4">
                        <div className="flex justify-between items-start bg-gray-50 p-3 rounded-lg text-sm mb-4">
                            <div>
                                <span className="block text-gray-500">Tarih</span>
                                <span className="font-semibold text-gray-900">{new Date(selectedOrder.order_date).toLocaleDateString()}</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-gray-500">Toplam</span>
                                <span className="font-bold text-blue-600 text-lg">
                                    {selectedOrder.items ? selectedOrder.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0} Koli
                                </span>
                            </div>
                        </div>

                        {selectedOrder.notes && (
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm text-yellow-800 mb-4">
                                <b>Not:</b> {selectedOrder.notes}
                            </div>
                        )}

                        <div className="max-h-[60vh] overflow-y-auto border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 text-gray-600 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Ürün</th>
                                        <th className="px-3 py-2 text-right">Adet</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {selectedOrder.items.map((item, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 text-gray-800">{item.product_name}</td>
                                            <td className="px-3 py-2 text-right font-bold text-gray-900">{item.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
