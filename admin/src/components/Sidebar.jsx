import { Link, useLocation } from 'react-router-dom';
import { Home, Users, ShoppingCart, FileText, MessageSquare, Package, X } from 'lucide-react';

export default function Sidebar({ onClose }) {
    const location = useLocation();

    const menuItems = [
        { path: '/', label: 'Dashboard', icon: Home },
        { path: '/personnel', label: 'Personel', icon: Users },
        { path: '/orders', label: 'Siparişler', icon: ShoppingCart },
        { path: '/products', label: 'Ürün Yönetimi', icon: Package },
        { path: '/reports', label: 'Raporlar', icon: FileText },
        { path: '/chat', label: 'Mesajlar', icon: MessageSquare },
    ];

    return (
        <div className="bg-white w-64 h-full border-r border-gray-200 flex flex-col shadow-lg">
            <div className="p-6 border-b flex items-center justify-between">
                <div className="flex items-center">
                    <span className="text-2xl font-bold text-blue-600">Atılım</span>
                    <span className="text-2xl font-bold text-gray-800 ml-1">Gıda</span>
                </div>
                {/* Mobile Close Button */}
                <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-gray-100 md:hidden transition"
                >
                    <X size={20} className="text-gray-400" />
                </button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => { if (window.innerWidth < 768) onClose(); }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition duration-200 ${active ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    );
}
