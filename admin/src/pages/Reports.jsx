import { useEffect, useState } from 'react';
import api from '../services/api';
import { FileText, Calendar, Search, Download, Eye, DollarSign, TrendingUp, AlertTriangle, Trash2 } from 'lucide-react';

export default function Reports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');

    // Helper for Initials
    const getInitials = (name) => {
        if (!name) return '';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/reports/all?date=${selectedDate}`);
            if (res.data.success) {
                setReports(res.data.reports);
            } else {
                setReports([]);
            }
        } catch (err) {
            console.error(err);
            setReports([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchReports();
    }, [selectedDate]);

    const openPdf = (reportId) => {
        // We use handleViewPdf for authenticated blob fetching
        handleViewPdf(reportId);
    };

    const handleViewPdf = async (reportId) => {
        try {
            const res = await api.get(`/reports/${reportId}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            window.open(url, '_blank');
        } catch (err) {
            alert('PDF görüntülenemedi.');
        }
    };

    const handleDelete = async (reportId) => {
        if (!window.confirm("Bu raporu silmek istediğinize emin misiniz? Bu işlem geri alınamaz!")) return;

        try {
            const res = await api.delete(`/reports/${reportId}`);
            if (res.data.success) {
                setReports(prev => prev.filter(r => r.id !== reportId));
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Silme işlemi başarısız');
        }
    };

    const handleDownloadExcel = async () => {
        if (!reports.length) {
            alert('İndirilecek rapor bulunamadı.');
            return;
        }

        try {
            // Using axios with responseType blob
            const response = await api.get(`/reports/export/excel?date=${selectedDate}`, {
                responseType: 'blob',
            });

            // Create Blob and Link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Gunluk_Rapor_${selectedDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Download Error:", error);
            alert('Excel indirilemedi.');
        }
    };

    // Calculate totals
    const totalCollection = reports.reduce((sum, r) => {
        const total = (r.cash_amount || 0) + (r.credit_card_amount || 0) + (r.check_amount || 0) + (r.eft_amount || 0);
        return sum + total;
    }, 0);

    const totalKm = reports.reduce((sum, r) => {
        const km = (r.end_km || 0) - (r.start_km || 0);
        return sum + (km > 0 ? km : 0);
    }, 0);

    const totalExpense = reports.reduce((sum, r) => sum + (r.fuel_expense || 0) + (r.maintenance_expense || 0) + (r.toll_expense || 0), 0);

    // Find missing cash cases
    const discrepancyCount = reports.filter(r => Math.abs(r.cash_amount - r.accounting_delivered) > 1).length;

    // Filter reports
    const filteredReports = reports.filter(r =>
        r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Günlük Raporlar</h1>
                    <p className="text-sm text-gray-500">Personel saha raporları ve PDF çıktıları.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => handleDownloadExcel()}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-sm"
                        title="Günlük Raporu Excel Olarak İndir"
                    >
                        <Download size={18} />
                        <span className="hidden md:inline">Excel İndir</span>
                    </button>

                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Personel veya plaka ara..."
                            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm w-64"
                        />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-gray-500 text-sm font-medium">Toplam Tahsilat</div>
                            <div className="text-2xl font-bold text-green-600">{totalCollection.toLocaleString('tr-TR')} ₺</div>
                        </div>
                        <div className="flex items-center justify-center w-7 h-7 bg-green-500 text-green-100 rounded font-bold text-lg">
                            ₺
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-gray-500 text-sm font-medium">Katedilen Yol</div>
                            <div className="text-2xl font-bold text-blue-600">{totalKm} km</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-gray-500 text-sm font-medium">Kasa Farkı Olan</div>
                            <div className={`text-2xl font-bold ${discrepancyCount > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                                {discrepancyCount} Rapor
                            </div>
                        </div>
                        {discrepancyCount > 0 && <AlertTriangle className="text-amber-500" size={28} />}
                    </div>
                </div>
            </div>

            {/* Reports List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Personel</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Araç</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Toplam KM</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Tahsilat</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Teslim Edildi</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500 text-right">PDF</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredReports.map((r) => {
                                const diff = r.cash_amount - r.accounting_delivered;
                                const hasDiff = Math.abs(diff) > 1; // 1 TL tolerance

                                return (
                                    <tr key={r.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold overflow-hidden">
                                                {r.profile_photo
                                                    ? <img src={`https://takip.atilimgida.com/${r.profile_photo}`} className="w-full h-full object-cover" />
                                                    : getInitials(r.full_name)
                                                }
                                            </div>
                                            {r.full_name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-mono text-sm">{r.vehicle_plate}</td>
                                        <td className="px-6 py-4 text-gray-600">{r.end_km - r.start_km} km</td>
                                        <td className="px-6 py-4 font-bold text-gray-700">
                                            {(
                                                (r.cash_amount || 0) +
                                                (r.credit_card_amount || 0) +
                                                (r.check_amount || 0) +
                                                (r.eft_amount || 0)
                                            ).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${r.accounting_delivered > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {r.accounting_delivered > 0 ? 'Evet' : 'Hayır'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => handleViewPdf(r.id)}
                                                className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition flex items-center gap-1"
                                                title="PDF Görüntüle"
                                            >
                                                <FileText size={18} />
                                                <span className="text-sm font-medium">PDF</span>
                                            </button>

                                            <button
                                                onClick={() => handleDelete(r.id)}
                                                className="text-gray-500 hover:text-red-600 hover:bg-gray-100 p-2 rounded-lg transition"
                                                title="Raporu Sil"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {reports.length === 0 && !loading && (
                    <div className="p-12 text-center text-gray-400">
                        <FileText size={48} className="mx-auto mb-3 opacity-20" />
                        <p>Bu tarihe ait rapor bulunamadı.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
