import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import io from 'socket.io-client';
import api from '../services/api';

// Map Controller for external control (focusing)
function MapController({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom, { duration: 1.5 });
        }
    }, [center, zoom, map]);
    return null;
}

// Custom Marker Generator
const createCustomIcon = (user) => {
    const hasPhoto = user.profile_photo;
    // Get base URL from api config or current origin
    const baseUrl = window.location.origin.includes('localhost') ? 'http://localhost:3000' : window.location.origin;
    const photoUrl = hasPhoto ? `${baseUrl}/${user.profile_photo}` : null;

    // Initials
    const initials = user.full_name
        ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : '?';

    // Use inline CSS for proper rendering
    const html = `
        <div style="position: relative; width: 40px; height: 40px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2); overflow: hidden; background: ${hasPhoto ? '#fff' : '#2563EB'}; display: flex; align-items: center; justify-content: center;">
                ${hasPhoto
            ? `<img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\\'color: white; font-weight: bold; font-size: 14px;\\'>${initials}</span>'; this.parentElement.style.background='#2563EB';"/>`
            : `<span style="color: white; font-weight: bold; font-size: 14px;">${initials}</span>`
        }
            </div>
            <div style="position: absolute; bottom: -2px; right: -2px; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; background: ${user.is_online ? '#10b981' : '#9ca3af'};"></div>
        </div>
    `;

    return L.divIcon({
        className: 'custom-marker',
        html: html,
        iconSize: [40, 40],
        iconAnchor: [20, 40], // Bottom center
        popupAnchor: [0, -40]
    });
};

export default function LiveMap({ focusUser }) {
    const [vehicles, setVehicles] = useState({});
    const [center, setCenter] = useState([38.438922448545654, 27.227150386506576]); // MERKEZ DEPO
    const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState(0);
    const socketRef = useRef();

    // Warehouse locations
    const warehouses = [
        { name: 'MERKEZ DEPO', lat: 38.438922448545654, lng: 27.227150386506576 },
        { name: 'EDREMİT DEPO', lat: 39.614296, lng: 26.947969 },
        { name: 'BERGAMA DEPO', lat: 39.116981926245465, lng: 27.196848095354138 }
    ];

    // Cycle through warehouses
    const handleWarehouseCenter = () => {
        const nextIndex = (currentWarehouseIndex + 1) % warehouses.length;
        setCurrentWarehouseIndex(nextIndex);
        setCenter([warehouses[nextIndex].lat, warehouses[nextIndex].lng]);
    };

    // Effect to handle external focus
    useEffect(() => {
        if (focusUser && focusUser.latitude && focusUser.longitude) {
            setCenter([focusUser.latitude, focusUser.longitude]);
        }
    }, [focusUser]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/gps/live');
                if (res.data.success) {
                    const vMap = {};
                    res.data.locations.forEach(v => {
                        vMap[v.user_id] = v;
                    });
                    setVehicles(vMap);
                }
            } catch (error) {
                console.error("GPS fetch error", error);
            }
        };
        fetchData();

        const token = localStorage.getItem('token');
        const socketServerUrl = window.location.origin.includes('localhost') ? 'http://localhost:3000' : window.location.origin;

        const socket = io(socketServerUrl, {
            auth: { token },
            query: { userRole: 'admin' }
        });

        socket.on('connect', () => {
            console.log("LiveMap Socket Connected:", socket.id);
        });

        socket.on('connect_error', (err) => {
            console.error("LiveMap Socket Error:", err);
        });

        socket.on('gps_updated', (data) => {
            console.log("GPS DATA RECEIVED:", data); // Debug Log
            setVehicles(prev => ({
                ...prev,
                [data.user_id]: { ...prev[data.user_id], ...data }
            }));
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // Periodic check for online status (every 10 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            setVehicles(prev => {
                const updated = {};
                Object.keys(prev).forEach(userId => {
                    const v = prev[userId];
                    if (v.last_update) {
                        const lastUpdateTime = new Date(v.last_update).getTime();
                        const now = Date.now();
                        const diffMinutes = (now - lastUpdateTime) / (1000 * 60);

                        // Update is_online based on time difference
                        updated[userId] = {
                            ...v,
                            is_online: diffMinutes < 5
                        };
                    } else {
                        updated[userId] = v;
                    }
                });
                return updated;
            });
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, []);

    const vehicleList = Object.values(vehicles);

    // Function to calculate offset for overlapping markers
    const getMarkerPosition = (user, index) => {
        const lat = user.latitude;
        const lng = user.longitude;

        // Find other users at same location (within 10 meters)
        const usersAtSameLocation = vehicleList.filter(v => {
            if (!v.latitude || !v.longitude) return false;
            const latDiff = Math.abs(v.latitude - lat);
            const lngDiff = Math.abs(v.longitude - lng);
            return latDiff < 0.0001 && lngDiff < 0.0001; // ~10 meters
        });

        if (usersAtSameLocation.length > 1) {
            // Calculate offset in circle pattern
            const userIndex = usersAtSameLocation.findIndex(v => v.user_id === user.user_id);
            const angle = (userIndex * 360) / usersAtSameLocation.length;
            const radius = 0.0002; // ~20 meters offset

            const offsetLat = lat + (radius * Math.cos(angle * Math.PI / 180));
            const offsetLng = lng + (radius * Math.sin(angle * Math.PI / 180));

            return [offsetLat, offsetLng];
        }

        return [lat, lng];
    };

    // Get base URL for images in Popup
    const baseUrl = window.location.origin.includes('localhost') ? 'http://localhost:3000' : window.location.origin;

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <MapContainer
                center={center}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />

                <MapController center={center} zoom={15} />

                {vehicleList.map((v, index) => (
                    v.latitude && v.longitude ? (
                        <Marker
                            key={`${v.user_id}-${v.last_update || v.timestamp}`}
                            position={getMarkerPosition(v, index)}
                            icon={createCustomIcon(v)}
                        >
                            <Popup>
                                <div className="p-2 min-w-[150px]">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden text-xs font-bold text-gray-600">
                                            {v.profile_photo
                                                ? <img src={`${baseUrl}/${v.profile_photo}`} className="w-full h-full object-cover" />
                                                : (v.full_name || '??').substring(0, 2).toUpperCase()
                                            }
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800 text-sm">{v.full_name}</div>
                                            <div className="text-[10px] text-gray-500">
                                                {new Date(v.last_update || v.timestamp).toLocaleTimeString('tr-TR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                        <div className="bg-blue-50 p-1.5 rounded text-center text-blue-700 font-semibold">
                                            {Math.round(v.speed)} km/s
                                        </div>
                                        <div className={`p-1.5 rounded text-center font-semibold text-white ${v.battery_level < 20 ? 'bg-red-500' : 'bg-green-500'}`}>
                                            %{v.battery_level} Batarya
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider ${v.is_online ? 'text-green-600' : 'text-gray-400'}`}>
                                            {v.is_online ? '● Çevrimiçi' : '○ Çevrimdışı'}
                                        </span>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ) : null
                ))}

                {/* Warehouse Circles */}
                {warehouses.map((warehouse, idx) => (
                    <Circle
                        key={warehouse.name}
                        center={[warehouse.lat, warehouse.lng]}
                        radius={300}
                        pathOptions={{
                            color: '#2563EB',
                            fillColor: '#60a5fa',
                            fillOpacity: 0.15,
                            weight: 2
                        }}
                    >
                        <Tooltip permanent direction="center" className="warehouse-tooltip">
                            <div style={{
                                fontWeight: 'bold',
                                fontSize: '12px',
                                textAlign: 'center',
                                color: '#1e40af',
                                textShadow: '1px 1px 2px white'
                            }}>
                                {warehouse.name}
                            </div>
                        </Tooltip>
                    </Circle>
                ))}
            </MapContainer>

            {/* Warehouse Center Button */}
            <button
                onClick={handleWarehouseCenter}
                className="absolute bottom-6 right-6 z-[1000] bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg shadow-lg font-semibold text-sm flex items-center gap-2 transition"
                title={`Şu an: ${warehouses[currentWarehouseIndex].name}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                </svg>
                {warehouses[(currentWarehouseIndex + 1) % warehouses.length].name}
            </button>
        </div>
    );
}
