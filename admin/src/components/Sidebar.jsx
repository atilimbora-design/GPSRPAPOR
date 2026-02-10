import { Link, useLocation } from 'react-router-dom';
import { Home, Users, ShoppingCart, FileText, MessageSquare, LogOut, Package } from 'lucide-react';

export default function Sidebar() {
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
        <div className="bg-white w-64 min-h-screen border-r border-gray-200 flex flex-col shadow-lg z-10">
            <div className="p-6 border-b flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">Atılım</span>
                <span className="text-2xl font-bold text-gray-800 ml-1">Gıda</span>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
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
