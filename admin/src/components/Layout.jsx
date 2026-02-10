import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function Layout() {
    const { user, logout } = useAuth();

    if (!user) return <Navigate to="/login" />;

    return (
        <div className="flex bg-gray-50 min-h-screen font-sans antialiased text-gray-900">
            <Sidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white px-6 py-4 border-b flex justify-between items-center shadow-sm z-10">
                    <h2 className="text-lg font-semibold text-gray-700">Yönetim Paneli</h2>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-gray-800">{user.full_name}</div>
                            <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                        </div>
                        <button onClick={logout} className="text-sm text-red-600 font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition">Çıkış Yap</button>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-6 relative">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
