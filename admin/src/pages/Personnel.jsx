import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Trash2, Edit2, Search, User, Lock, Phone, BadgeCheck, Shield, KeyRound, Users as UsersIcon } from 'lucide-react';
import Modal from '../components/Modal';

export default function Personnel() {
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        phone: '',
        role: 'personel',
        is_active: true
    });

    const fetchUsers = async () => {
        try {
            // Fetch ALL users (both admin and personel)
            const res = await api.get('/users');
            if (res.data.success) {
                setUsers(res.data.users);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await api.patch(`/users/${editingUser.id}`, formData);
            } else {
                await api.post('/users', formData);
            }
            setIsModalOpen(false);
            setEditingUser(null);
            resetForm();
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.error || 'İşlem başarısız');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/users/${id}`);
            fetchUsers();
        } catch (error) {
            alert('Silme başarısız');
        }
    };

    const openEdit = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '',
            full_name: user.full_name,
            phone: user.phone || '',
            role: user.role,
            is_active: user.is_active
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            full_name: '',
            phone: '',
            role: 'personel',
            is_active: true
        });
    };

    const filteredUsers = users.filter(u =>
        u.full_name.toLowerCase().includes(filter.toLowerCase()) ||
        u.username.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Kullanıcı Yönetimi</h1>
                    <p className="text-gray-500 text-sm">Toplam {users.length} kullanıcı kayıtlı</p>
                </div>

                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="İsim veya ID ara..."
                            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => { setEditingUser(null); resetForm(); setIsModalOpen(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition whitespace-nowrap"
                    >
                        <Plus size={18} />
                        <span>Yeni Ekle</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">ID</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Kullanıcı</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Rol</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Giriş ID</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Telefon</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500 text-center">Durum</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-gray-500 font-mono text-sm">#{u.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 overflow-hidden shrink-0 border border-indigo-200">
                                                {u.profile_photo ?
                                                    <img src={`https://takip.atilimgida.com/${u.profile_photo}`} className="w-full h-full object-cover" />
                                                    : <span className="font-bold text-lg">{u.full_name.charAt(0)}</span>
                                                }
                                            </div>
                                            <div className="font-semibold text-gray-900">{u.full_name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border ${u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                            {u.role === 'admin' ? 'Yönetici' : 'Personel'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 bg-gray-100 w-fit px-2 py-1 rounded text-sm text-gray-700 font-mono">
                                            <BadgeCheck size={14} className="text-gray-500" />
                                            {u.username}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 text-sm">
                                        {u.phone ? u.phone : <span className="text-gray-300">-</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${u.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {u.is_active ? 'AKTİF' : 'PASİF'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openEdit(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Düzenle"><Edit2 size={18} /></button>
                                            <button onClick={() => handleDelete(u.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Sil"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredUsers.length === 0 && !loading && (
                    <div className="p-12 text-center">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UsersIcon size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-gray-800 font-medium mb-1">Kayıt Bulunamadı</h3>
                        <p className="text-gray-500 text-sm">Aradığınız kriterlere uygun kullanıcı yok.</p>
                    </div>
                )}
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <Modal
                    title={editingUser ? `Düzenle: ${editingUser.full_name}` : 'Yeni Kullanıcı Ekle'}
                    onClose={() => setIsModalOpen(false)}
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hesap Türü (Rol)</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-2.5 text-gray-400 w-5 h-5 pointer-events-none" />
                                <select
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white cursor-pointer"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="personel">Personel</option>
                                    <option value="admin">Yönetici (Admin)</option>
                                </select>
                            </div>
                            {formData.role === 'admin' && (
                                <p className="text-xs text-amber-600 mt-1 ml-1 font-medium">⚠️ Yönetici hesapları sisteme tam erişime sahiptir.</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    required
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Örn: Dinçer Sezan"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Adı (Giriş ID)</label>
                            <div className="relative">
                                <BadgeCheck className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    required
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Örn: 1"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1 ml-1">Kullanıcı uygulamaya girişte bu ID'yi kullanacak.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {editingUser ? 'Şifre (Değiştirmek istemiyorsanız boş bırakın)' : 'Şifre'}
                            </label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                                <input
                                    type="password"
                                    required={!editingUser}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon Numarası</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="05XX XXX XX XX"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        {editingUser && (
                            <div className="flex items-center gap-2 mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                                    Kullanıcı sisteme giriş yapabilsin (Aktif)
                                </label>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition flex items-center gap-2"
                            >
                                <Shield size={18} />
                                {editingUser ? 'Güncelle' : 'Kaydet'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
