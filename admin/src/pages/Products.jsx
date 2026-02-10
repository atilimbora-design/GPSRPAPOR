import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Trash2, Edit2, Search, Package, CheckCircle, Tag, Layers, RefreshCw } from 'lucide-react';
import Modal from '../components/Modal';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [filter, setFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        category: '',
        unit: 'KOLI',
        sort_order: 999,
        is_active: true
    });

    const CATEGORIES = [
        'Donuk / Hazır',
        'Kıyma',
        'Parça & Kesim',
        'Bütün Poşetli',
        'HS Bütün',
        'TB'
    ];

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/products');
            if (res.data.success) {
                setProducts(res.data.products);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, formData);
            } else {
                await api.post('/products', formData);
            }
            setIsModalOpen(false);
            setEditingProduct(null);
            resetForm();
            fetchProducts();
        } catch (error) {
            alert(error.response?.data?.error || 'İşlem başarısız');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/products/${id}`);
            fetchProducts();
        } catch (error) {
            alert(error.response?.data?.error || 'Silme başarısız');
        }
    };

    const openEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            code: product.code,
            category: product.category,
            unit: product.unit,
            sort_order: product.sort_order,
            is_active: product.is_active
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            category: CATEGORIES[0], // Default
            unit: 'KOLI',
            sort_order: 999,
            is_active: true
        });
    };

    // Filter Logic
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(filter.toLowerCase()) ||
            p.code.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Ürün Listesi</h1>
                    <p className="text-gray-500 text-sm">Toplam {products.length} ürün</p>
                </div>

                <div className="flex gap-3 flex-wrap">
                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700"
                    >
                        <option value="ALL">Tüm Kategoriler</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Ürün adı veya kodu..."
                            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => { setEditingProduct(null); resetForm(); setIsModalOpen(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition whitespace-nowrap"
                    >
                        <Plus size={18} />
                        <span>Yeni Ürün</span>
                    </button>
                    <button onClick={fetchProducts} className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600">
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Kod</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Ürün Adı</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Kategori</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500 text-center">Sıra</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500 text-center">Durum</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredProducts.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-gray-500 font-mono text-sm font-bold">{p.code}</td>
                                    <td className="px-6 py-4 text-gray-900 font-medium">{p.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                            {p.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-500 text-sm">{p.sort_order}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {p.is_active ? 'AKTİF' : 'PASİF'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Düzenle"><Edit2 size={18} /></button>
                                            <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Sil"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredProducts.length === 0 && !loading && (
                    <div className="p-12 text-center text-gray-500">
                        <Package size={48} className="mx-auto mb-3 opacity-20" />
                        <p>Kriterlere uygun ürün bulunamadı.</p>
                    </div>
                )}
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <Modal
                    title={editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
                    onClose={() => setIsModalOpen(false)}
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı</label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.name}
                                onChange={e => {
                                    // Auto-generate code when typing name if it's empty or we are in 'create' mode
                                    const newName = e.target.value;
                                    const updates = { name: newName };
                                    if (!editingProduct) { // Only auto-gen for new products
                                        updates.code = newName.replace(/ /g, '_').replace(/\./g, '').replace(/&/g, '').toUpperCase();
                                    }
                                    setFormData({ ...formData, ...updates });
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Kodu (Otomatik)</label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-gray-50"
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                                <select
                                    required
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sıra No</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.sort_order}
                                    onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Birim</label>
                                <select
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    value={formData.unit}
                                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                >
                                    <option value="KOLI">KOLI</option>
                                    <option value="KG">KG</option>
                                    <option value="ADET">ADET</option>
                                    <option value="PKT">PKT</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2 p-3 bg-gray-50 rounded-lg border">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                Ürün Satışa Açık (Aktif)
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition flex items-center gap-2"
                            >
                                <CheckCircle size={18} />
                                {editingProduct ? 'Güncelle' : 'Kaydet'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
