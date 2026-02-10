import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Layout() {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    if (!user) return <Navigate to="/login" />;

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex bg-gray-50 min-h-screen font-sans antialiased text-gray-900 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}

            {/* Sidebar Wrapper */}
            <div className={`
                fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                md:relative md:translate-x-0 transition duration-200 ease-in-out z-30
            `}>
                <Sidebar onClose={() => setIsSidebarOpen(false)} />
            </div>

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white px-4 md:px-6 py-4 border-b flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={toggleSidebar}
                            className="p-2 rounded-lg hover:bg-gray-100 md:hidden transition"
                        >
                            <Menu size={24} className="text-gray-600" />
                        </button>
                        <h2 className="text-lg font-semibold text-gray-700">Atılım Takip</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-gray-800 leading-tight">{user.full_name}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider">{user.role}</div>
                        </div>
                        <button
                            onClick={logout}
                            className="text-sm text-red-600 font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-100 transition"
                        >
                            <span className="hidden xs:inline">Çıkış</span>
                            <LogOut size={16} className="xs:hidden" />
                            <span className="xs:hidden">Çıkış</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-4 md:p-6 bg-gray-50">
                    <div className="max-w-7xl mx-auto h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}

// Helper to support LogOut icon in the header if needed
import { LogOut as LogOutIcon } from 'lucide-react';
const LogOut = LogOutIcon;
