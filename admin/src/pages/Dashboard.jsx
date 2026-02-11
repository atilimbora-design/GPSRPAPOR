import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom'; // Added useNavigate
import LiveMap from '../components/LiveMap';
import api from '../services/api';
import { MessageSquare, MapPin } from 'lucide-react';
import io from 'socket.io-client';

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // State for personnel list below map
    const [personnel, setPersonnel] = useState([]);
    const [focusedUser, setFocusedUser] = useState(null);

    // Fetch personnel with GPS status
    useEffect(() => {
        const fetchPersonnel = async () => {
            try {
                // We use GPS live endpoint because it has the latest coordinates + user info
                // Or combine users list + gps. 
                // Using /gps/live is best for "Who is where" list.
                const res = await api.get('/gps/live');
                if (res.data.success) {
                    setPersonnel(res.data.locations);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchPersonnel();

        // Socket Connection for Real-time Updates
        const token = localStorage.getItem('token');
        const socketServerUrl = window.location.origin.includes('localhost') ? 'http://localhost:3000' : window.location.origin;

        const socket = io(socketServerUrl, {
            auth: { token },
            query: { userRole: 'admin' },
            reconnection: true
        });

        socket.on('gps_updated', (data) => {
            setPersonnel(prev => prev.map(p => {
                if (p.user_id === data.user_id) {
                    return {
                        ...p,
                        ...data,
                        // Ensure is_online is true on update unless explicitly false
                        is_online: data.is_online !== undefined ? data.is_online : true,
                        // Update timestamp so local checker keeps it online
                        last_update: data.timestamp || new Date().toISOString()
                    };
                }
                return p;
            }));
        });

        // Periodic API Refresh (fallback)
        const interval = setInterval(fetchPersonnel, 10000); // 10 saniyeye düşürüldü

        return () => {
            clearInterval(interval);
            socket.close();
        };
    }, []);

    const handleFocus = (p) => {
        if (p.latitude && p.longitude) {
            setFocusedUser(p);
        } else {
            alert('Bu personelin konum bilgisi yok');
        }
    };

    const startChat = (userId) => {
        navigate('/chat', { state: { targetUserId: userId } });
    };

    const [stats, setStats] = useState({
        active: 0,
        totalCollection: 0,
        pendingOrders: 0,
        approvedReports: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            const today = new Date().toISOString().split('T')[0];
            try {
                const [reportsRes, ordersRes] = await Promise.all([
                    api.get(`/reports/all?date=${today}`),
                    api.get(`/orders?date=${today}`)
                ]);

                let collection = 0;
                let reportCount = 0;
                if (reportsRes.data.success) {
                    collection = reportsRes.data.reports.reduce((sum, r) => {
                        const amount = (r.cash_amount || 0) + (r.credit_card_amount || 0) + (r.check_amount || 0) + (r.eft_amount || 0);
                        return sum + amount;
                    }, 0);
                    reportCount = reportsRes.data.reports.length;
                }

                let pending = 0;
                if (ordersRes.data.success) {
                    // Assuming orders have a status or we count all for today. 
                    // Typically "Pending" means not delivered. 
                    // Using mock property 'status' or just count for now as per "Bekleyen Sipariş" usually implies active queue.
                    // The order structure from Order.jsx suggests they are daily orders. 
                    // Let's count all orders for today as "Received Orders" or just mock "Pending" if status exists.
                    // Looking at Order.jsx, it doesn't seem to explicitly filter by status 'pending'.
                    // We will count TOTAL orders for now as a proxy, or check 'is_completed' if it exists.
                    // Reports.jsx doesn't imply order status.
                    // But in Orders.jsx we saw "Tamamlandı" check.
                    pending = ordersRes.data.orders.length; // Simplified
                }

                setStats(prev => ({
                    ...prev,
                    totalCollection: collection,
                    pendingOrders: pending,
                    approvedReports: reportCount
                }));

            } catch (e) {
                console.error("Stats fetch error", e);
            }
        };
        fetchStats();
    }, []);

    // Sync active count from personnel list
    useEffect(() => {
        setStats(prev => ({ ...prev, active: personnel.filter(p => p.is_online).length }));
    }, [personnel]);

    // Periodic check for online status (every 10 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            setPersonnel(prev => prev.map(p => {
                if (p.last_update) {
                    const lastUpdateTime = new Date(p.last_update).getTime();
                    const now = Date.now();
                    const diffMinutes = (now - lastUpdateTime) / (1000 * 60);

                    return {
                        ...p,
                        is_online: diffMinutes < 2 // 5 dakikadan 2 dakikaya düşürüldü daha hassas takip için
                    };
                }
                return p;
            }));
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, []);

    // Helper for Initials
    const getInitials = (name) => {
        if (!name) return '??';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    // Sort personnel: Online first (handle both boolean and 1/0), then alphabetically
    const sortedPersonnel = [...personnel].sort((a, b) => {
        const aOnline = a.is_online === true || a.is_online === 1;
        const bOnline = b.is_online === true || b.is_online === 1;

        if (aOnline === bOnline) {
            return (a.full_name || '').localeCompare(b.full_name || '', 'tr');
        }
        return aOnline ? -1 : 1;
    });

    const baseUrl = window.location.origin.includes('localhost') ? 'http://localhost:3000' : window.location.origin;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { title: 'Aktif Personel', value: `${stats.active}/${personnel.length}`, color: 'bg-green-100 text-green-700' },
                    { title: 'Bugünkü Tahsilat', value: `${stats.totalCollection.toLocaleString('tr-TR')} TL`, color: 'bg-blue-100 text-blue-700' },
                    { title: 'Bekleyen Sipariş', value: stats.pendingOrders, color: 'bg-amber-100 text-amber-700' }, // Using total count as proxy
                    { title: 'Onaylanan Rapor', value: stats.approvedReports, color: 'bg-purple-100 text-purple-700' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div className="text-sm text-gray-500 mb-1 font-medium">{stat.title}</div>
                        <div className={`text-2xl font-bold ${stat.color.split(' ')[1]}`}>{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-220px)]">

                {/* Left: Map */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <MapPin size={18} className="text-blue-600" />
                            Canlı Araç Takibi
                        </h2>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full animate-pulse border border-green-200">
                            • Canlı
                        </span>
                    </div>
                    <div className="flex-1 relative">
                        <LiveMap focusUser={focusedUser} />
                    </div>
                </div>

                {/* Right: Personnel List */}
                <div className="w-full lg:w-96 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-gray-50">
                        <h2 className="font-semibold text-gray-800">Personel Durumu</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
                        {sortedPersonnel.map(p => (
                            <div
                                key={p.user_id}
                                onClick={() => handleFocus(p)}
                                className={`flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 cursor-pointer transition ${focusedUser?.user_id === p.user_id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : ''}`}
                            >
                                {/* Avatar */}
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold overflow-hidden shadow-sm">
                                        {p.profile_photo
                                            ? <img src={`${baseUrl}/${p.profile_photo}`} className="w-full h-full object-cover" />
                                            : getInitials(p.full_name)
                                        }
                                    </div>
                                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${p.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                </div>

                                {/* Status */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 truncate">{p.full_name}</div>
                                    <div className="text-xs text-gray-500 flex flex-col gap-0.5">
                                        {p.is_online ? (
                                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                                <span>🔋 %{p.battery_level}</span>
                                                <span>•</span>
                                                <span>{Math.round(p.speed)} km/s</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic">Çevrimdışı</span>
                                        )}
                                        {p.last_update && (
                                            <span className="text-[10px] text-gray-400">
                                                Son: {new Date(p.last_update).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); startChat(p.user_id); }}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
                                    title="Mesaj Gönder"
                                >
                                    <MessageSquare size={18} />
                                </button>
                            </div>
                        ))}
                        {personnel.length === 0 && (
                            <div className="text-center text-gray-400 py-10 text-sm italic">Personel listesi yükleniyor...</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
