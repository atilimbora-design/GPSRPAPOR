import { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Send, Image as ImageIcon, MoreVertical, Paperclip, ArrowLeft, Trash2, Info, X, Check, LogOut, UserMinus, UserPlus, Bell } from 'lucide-react';
import Modal from '../components/Modal';

export default function Chat() {
    const { user } = useAuth();
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    const location = useLocation();
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [socket, setSocket] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Group Modal State (Creation)
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);

    // Group Info Modal (Management)
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [groupMembers, setGroupMembers] = useState([]);
    const [isAddingMembers, setIsAddingMembers] = useState(false);
    const [currentGroupDetails, setCurrentGroupDetails] = useState(null);
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

    // Action Menu
    const [showMenu, setShowMenu] = useState(false);

    // 1. Initialize Socket & Load Conversations
    useEffect(() => {
        const token = localStorage.getItem('token');
        const newSocket = io('http://localhost:3000', {
            auth: { token },
            query: { userRole: 'admin' },
            reconnection: true,
            reconnectionAttempts: 10
        });

        // Request Notification Permission
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }

        newSocket.on('new_message', (msg) => {
            handleIncomingMessage(msg, 'direct');
            if (Notification.permission === 'granted' && msg.sender_id !== userRef.current?.id) {
                new Notification(`Yeni Mesaj: ${msg.sender_name || 'Biri'}`, { body: msg.message_type === 'image' ? 'Fotoğraf gönderdi' : msg.content });
            }
        });

        newSocket.on('new_group_message', (msg) => {
            handleIncomingMessage(msg, 'group');
            if (Notification.permission === 'granted' && msg.sender_id !== userRef.current?.id) {
                new Notification(`Grup: ${msg.group_name || 'Grup'} | ${msg.sender_name}`, { body: msg.message_type === 'image' ? 'Fotoğraf gönderdi' : msg.content });
            }
        });

        newSocket.on('message_deleted', ({ id }) => {
            setMessages(prev => prev.filter(m => m.id !== id));
        });

        newSocket.on('chat_cleared', ({ targetId, type }) => {
            setActiveChat(current => {
                if (current) {
                    const isSame = type === 'group'
                        ? (current.group_id === targetId || current.id === targetId)
                        : (current.user_id === targetId || user.id === targetId); // Simplified logic

                    if (isSame) setMessages([]);
                }
                return current;
            });
            fetchConversations();
        });

        setSocket(newSocket);
        fetchConversations();
        fetchAllUsers();

        return () => newSocket.disconnect();
    }, []);

    // 2. Handle Navigation
    useEffect(() => {
        if (location.state?.targetUserId) {
            const targetId = location.state.targetUserId;
            if (activeChat?.user_id === targetId) return;
            const existing = conversations.find(c => c.type === 'direct' && c.user_id === targetId);
            if (existing) {
                setActiveChat(existing);
            } else {
                api.get('/users?role=personel').then(res => {
                    if (res.data.success) {
                        const u = res.data.users.find(u => u.id === targetId);
                        if (u) {
                            setActiveChat({
                                type: 'direct',
                                user_id: u.id,
                                full_name: u.full_name,
                                profile_photo: u.profile_photo,
                                phone: u.phone,
                                is_temp: true
                            });
                        }
                    }
                }).catch(err => console.error("User fetch error", err));
            }
            window.history.replaceState({}, document.title);
        }
    }, [location.state, conversations, activeChat]);

    // 3. Fetch Messages & Info
    useEffect(() => {
        if (!activeChat) return;
        setMessages([]);
        setShowMenu(false);
        setShowGroupInfo(false);
        setIsAddingMembers(false);

        const fetchMessages = async () => {
            try {
                let url = activeChat.type === 'direct'
                    ? `/messages/direct/${activeChat.user_id}`
                    : `/messages/group/${activeChat.group_id || activeChat.id}`;

                const res = await api.get(url);
                if (res.data.success) {
                    setMessages(res.data.messages.reverse());
                    setTimeout(scrollToBottom, 100);
                }
            } catch (err) { console.error(err); }
        };
        fetchMessages();
    }, [activeChat]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchConversations = async () => {
        try {
            const res = await api.get('/messages/conversations');
            if (res.data.success) {
                setConversations(res.data.conversations);
            }
        } catch (err) { console.error(err); }
    };

    const fetchAllUsers = async () => {
        const res = await api.get('/users');
        if (res.data.success) setAllUsers(res.data.users);
    };

    useEffect(() => {
        fetchConversations();
        fetchAllUsers();
    }, []);

    const fetchGroupMembers = async (groupId) => {
        try {
            const res = await api.get(`/groups/${groupId}`);
            if (res.data.success) {
                setGroupMembers(res.data.group.members);
                setCurrentGroupDetails(res.data.group);
                setShowGroupInfo(true);
            }
        } catch (err) { alert('Grup bilgileri alınamadı'); }
    };

    const handleDeleteGroup = async () => {
        if (!currentGroupDetails) return;
        if (!window.confirm("DİKKAT! Bu grubu ve tüm mesajları kalıcı olarak silmek istediğinize emin misiniz?")) return;
        try {
            const res = await api.delete(`/groups/${currentGroupDetails.id}`);
            if (res.data.success) {
                alert('Grup silindi.');
                setShowGroupInfo(false);
                setGroupMembers([]);
                setActiveChat(null);
                fetchConversations();
            }
        } catch (err) { alert('Silinemedi'); }
    };

    const requestNotify = () => {
        Notification.requestPermission().then(perm => {
            setNotificationPermission(perm);
            if (perm === 'granted') new Notification('Bildirimler Açık', { body: 'Test bildirimi' });
        });
    };

    const handleToggleGroupStatus = async () => {
        if (!currentGroupDetails) return;
        const newStatus = !currentGroupDetails.is_active;
        const actionName = newStatus ? 'aktifleştirmek' : 'kapatmak';

        if (!window.confirm(`Bu grubu ${actionName} istediğinize emin misiniz?`)) return;

        try {
            const res = await api.put(`/groups/${currentGroupDetails.id}/status`, { is_active: newStatus });
            if (res.data.success) {
                alert(`Grup ${newStatus ? 'aktif' : 'kapalı'} hale getirildi.`);
                fetchGroupMembers(currentGroupDetails.id);
            }
        } catch (err) { alert('İşlem başarısız'); }
    };

    const handleIncomingMessage = (msg, type) => {
        setActiveChat(current => {
            if (current &&
                ((type === 'direct' && current.type === 'direct' && (current.user_id === msg.sender_id || current.user_id === msg.receiver_id)) ||
                    (type === 'group' && current.type === 'group' && (current.group_id === msg.group_id || current.id === msg.group_id)))) {
                setMessages(prev => [...prev, msg]);
                setTimeout(scrollToBottom, 100);
            }
            return current;
        });
        fetchConversations();
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !fileInputRef.current?.files[0]) return;

        const formData = new FormData();
        formData.append('content', newMessage);
        const targetId = activeChat.type === 'direct' ? activeChat.user_id : (activeChat.group_id || activeChat.id);

        if (activeChat.type === 'direct') {
            formData.append('receiver_id', targetId);
        } else {
            formData.append('group_id', targetId);
        }
        formData.append('message_type', 'text');

        if (fileInputRef.current?.files[0]) {
            formData.append('file', fileInputRef.current.files[0]);
            formData.set('message_type', 'image');
        }

        try {
            const res = await api.post('/messages/send', formData);
            if (res.data.success) {
                setMessages(prev => [...prev, { ...res.data.message, is_mine: true }]);
                setNewMessage('');
                if (fileInputRef.current) fileInputRef.current.value = '';
                scrollToBottom();
                fetchConversations();
            }
        } catch (err) { alert('Mesaj gönderilemedi'); }
    };

    const createGroup = async () => {
        if (!newGroupName || selectedUsers.length === 0) return;
        try {
            const formData = new FormData();
            formData.append('name', newGroupName);
            formData.append('member_ids', JSON.stringify(selectedUsers));

            const res = await api.post('/groups', formData);
            if (res.data.success) {
                setIsGroupModalOpen(false);
                fetchConversations();
                alert('Grup oluşturuldu!');
                // Reset
                setNewGroupName('');
                setSelectedUsers([]);
            }
        } catch (err) { alert('Grup oluşturulamadı'); }
    };

    const handleDeleteMessage = async (msgId) => {
        if (!window.confirm('Bu mesajı silmek istiyor musunuz?')) return;
        try {
            await api.delete(`/messages/${msgId}`);
        } catch (err) { alert('Silinemedi'); }
    }

    const handleClearChat = async () => {
        if (!window.confirm('Tüm sohbet geçmişi silinecek. Emin misiniz?')) return;
        try {
            const targetId = activeChat.type === 'direct' ? activeChat.user_id : (activeChat.group_id || activeChat.id);
            await api.post('/messages/clear', { targetId, type: activeChat.type });
            setShowMenu(false);
        } catch (err) { alert('Temizlenemedi'); }
    }

    // --- Group Member Management ---
    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Bu üyeyi gruptan çıkarmak istiyor musunuz?')) return;
        try {
            const groupId = activeChat.group_id || activeChat.id;
            await api.delete(`/groups/${groupId}/members`, { data: { userId } });
            fetchGroupMembers(groupId); // Refresh list
        } catch (err) { alert('Üye çıkarılamadı'); }
    };

    const handleAddMembers = async () => {
        if (selectedUsers.length === 0) return;
        try {
            const groupId = activeChat.group_id || activeChat.id;
            await api.post(`/groups/${groupId}/members`, { user_ids: selectedUsers });
            setIsAddingMembers(false);
            setSelectedUsers([]);
            fetchGroupMembers(groupId); // Refresh list
        } catch (err) { alert('Üye eklenemedi'); }
    };

    // Filter available users for adding to group (exclude existing members)
    const availableUsersToAdd = allUsers.filter(u => !groupMembers.some(m => m.user_id === u.id));

    const displayConversations = useMemo(() => {
        if (!searchTerm) return conversations;

        const lowerTerm = searchTerm.toLowerCase();

        // 1. Existing Chats
        const existing = conversations.filter(c =>
            (c.group_name || c.full_name).toLowerCase().includes(lowerTerm)
        );

        // 2. New Users from Search
        const existingIds = new Set(conversations.filter(c => c.type === 'direct').map(c => c.user_id));

        const newResults = allUsers
            .filter(u =>
                !existingIds.has(u.id) &&
                u.id !== userRef.current?.id &&
                (u.full_name.toLowerCase().includes(lowerTerm) || u.username.toLowerCase().includes(lowerTerm))
            )
            .map(u => ({
                id: `new_${u.id}`, // Temp ID
                type: 'direct',
                user_id: u.id,
                full_name: u.full_name,
                profile_photo: u.profile_photo,
                unread_count: 0,
                last_message: null
            }));

        return [...existing, ...newResults];
    }, [searchTerm, conversations, allUsers]);

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '';

    return (
        <div className="flex h-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden font-sans">

            {/* SIDEBAR */}
            <div className={`w-full md:w-80 border-r border-gray-100 flex flex-col bg-white ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <h2 className="font-bold text-xl text-gray-800 tracking-tight">Mesajlar</h2>
                        <button onClick={requestNotify} title={notificationPermission === 'granted' ? 'Bildirimler Açık' : 'Bildirimleri Aç'}>
                            <Bell size={16} className={notificationPermission === 'granted' ? 'text-green-500' : 'text-red-500'} />
                        </button>
                    </div>
                    <button
                        onClick={() => { setIsGroupModalOpen(true); setSelectedUsers([]); }}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
                        title="Yeni Grup"
                    >
                        <Plus size={18} />
                    </button>
                </div>
                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Ara..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {displayConversations.map((c, i) => (
                        <div
                            key={i}
                            onClick={() => setActiveChat(c)}
                            className={`flex items-center gap-3 p-4 hover:bg-blue-50/50 cursor-pointer transition border-b border-gray-50 ${activeChat?.id === c.id ? 'bg-blue-50' : ''}`}
                        >
                            <div className="relative shrink-0">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden text-gray-600 font-bold shadow-inner">
                                    {c.profile_photo || c.group_photo
                                        ? <img src={`http://localhost:3000/${c.profile_photo || c.group_photo}`} className="w-full h-full object-cover" />
                                        : getInitials(c.group_name || c.full_name)
                                    }
                                </div>
                                {c.type === 'direct' && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className="font-semibold text-gray-900 truncate">{c.group_name || c.full_name}</h3>
                                    <span className="text-xs text-gray-400 font-medium">
                                        {c.last_message ? new Date(c.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className={`text-sm truncate pr-2 ${c.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                        {c.last_message ?
                                            (c.last_message.message_type === 'image' ? '📷 Fotoğraf' : c.last_message.content)
                                            : <span className="italic opacity-60">Mesaj yok</span>
                                        }
                                    </p>
                                    {c.unread_count > 0 && (
                                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                            {c.unread_count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CHAT AREA */}
            <div className={`flex-1 flex flex-col bg-gray-50/30 ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
                {activeChat ? (
                    <>
                        {/* Header */}
                        <div className="h-16 bg-white border-b border-gray-100 px-6 flex items-center justify-between shadow-sm z-10 sticky top-0">
                            <div className="flex items-center gap-4 cursor-pointer" onClick={() => activeChat.type === 'group' && fetchGroupMembers(activeChat.group_id || activeChat.id)}>
                                <button onClick={(e) => { e.stopPropagation(); setActiveChat(null); }} className="md:hidden p-2 -ml-2 text-gray-600">
                                    <ArrowLeft size={20} />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden text-gray-600 font-bold border border-gray-100">
                                    {activeChat.profile_photo || activeChat.group_photo
                                        ? <img src={`http://localhost:3000/${activeChat.profile_photo || activeChat.group_photo}`} className="w-full h-full object-cover" />
                                        : getInitials(activeChat.group_name || activeChat.full_name)
                                    }
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 flex items-center gap-2">
                                        {activeChat.group_name || activeChat.full_name}
                                        {activeChat.type === 'group' && <Info size={14} className="text-gray-400" />}
                                    </div>
                                    <div className="text-xs text-blue-600 font-medium">
                                        {activeChat.type === 'group' ? 'Grup Bilgisi İçin Dokun' : 'Aktif'}
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition">
                                    <MoreVertical size={20} />
                                </button>
                                {showMenu && (
                                    <div className="absolute right-0 top-10 bg-white shadow-xl border border-gray-100 rounded-lg p-1 w-48 z-20 animate-fade-in">
                                        <button onClick={handleClearChat} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium flex items-center gap-2 transition">
                                            <Trash2 size={16} /> Sohbeti Temizle
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.is_mine ? 'justify-end' : 'justify-start'} group hover:z-10`}>
                                    {activeChat.type === 'group' && !m.is_mine && (
                                        <div className="w-8 h-8 rounded-full bg-gray-200 mr-2 mt-1 overflow-hidden shrink-0 border border-gray-100">
                                            {m.sender_photo
                                                ? <img src={`http://localhost:3000/${m.sender_photo}`} className="w-full h-full object-cover" />
                                                : <span className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">{getInitials(m.sender_name)}</span>
                                            }
                                        </div>
                                    )}
                                    <div className="max-w-[70%] relative">
                                        {activeChat.type === 'group' && !m.is_mine && (
                                            <div className="text-[11px] font-bold text-gray-500 ml-1 mb-1">{m.sender_name}</div>
                                        )}

                                        <div
                                            className={`rounded-2xl px-4 py-3 shadow-sm relative text-sm leading-relaxed transition-all
                                            ${m.is_mine
                                                    ? 'bg-blue-600 text-white rounded-br-none'
                                                    : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                                                }`}
                                        >
                                            {m.message_type === 'image' ? (
                                                <div className="rounded-lg overflow-hidden mb-1">
                                                    <img src={`http://localhost:3000/${m.content}`} className="max-w-full max-h-64 object-cover" />
                                                </div>
                                            ) : (
                                                <div className="whitespace-pre-wrap">{m.content}</div>
                                            )}
                                        </div>

                                        <div className={`text-[10px] mt-1 flex items-center gap-1 opacity-70 ${m.is_mine ? 'justify-end text-gray-500' : 'justify-start text-gray-400'}`}>
                                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {m.is_mine && <Check size={12} strokeWidth={3} className="text-blue-500" />}
                                        </div>

                                        <button
                                            onClick={() => handleDeleteMessage(m.id)}
                                            className={`absolute top-2 p-1.5 bg-white shadow-md rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                                            ${m.is_mine ? '-left-10' : '-right-10'}`}
                                            title="Mesajı Sil"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-100 flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current.click()}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
                            >
                                <Paperclip size={22} />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={() => { if (fileInputRef.current.files[0]) setNewMessage('📷 Resim seçildi'); }}
                            />
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder="Bir mesaj yazın..."
                                    className="w-full py-3 px-5 bg-gray-50 border border-gray-200 rounded-full outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition text-gray-700 placeholder-gray-400"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                                disabled={!newMessage.trim() && !fileInputRef.current?.files?.[0]}
                            >
                                <Send size={20} fill="currentColor" />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                        <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 animate-bounce-slow">
                            <ImageIcon size={40} className="text-blue-200" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-700">Atılım Gıda Haberleşme</h3>
                        <p className="mt-2 text-sm text-gray-500">Sohbet etmek için soldan bir kişi seçin.</p>
                    </div>
                )}
            </div>

            {/* CREATE GROUP MODAL */}
            {isGroupModalOpen && (
                <Modal title="Yeni Grup Oluştur" onClose={() => setIsGroupModalOpen(false)}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Grup Adı</label>
                            <input
                                type="text"
                                className="w-full border p-2 rounded-lg outline-none focus:border-blue-500"
                                placeholder="Örn: Satış Ekibi"
                                value={newGroupName}
                                onChange={e => setNewGroupName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Üyeler</label>
                            <div className="h-48 overflow-y-auto border rounded-lg p-2 space-y-1 custom-scrollbar">
                                {allUsers.map(u => (
                                    <div
                                        key={u.id}
                                        onClick={() => {
                                            if (selectedUsers.includes(u.id)) setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                                            else setSelectedUsers([...selectedUsers, u.id]);
                                        }}
                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${selectedUsers.includes(u.id) ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${selectedUsers.includes(u.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                            {selectedUsers.includes(u.id) && <Check size={12} className="text-white" />}
                                        </div>
                                        <div className="text-sm font-medium text-gray-800">{u.full_name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button
                                onClick={createGroup}
                                disabled={!newGroupName || selectedUsers.length === 0}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                                Oluştur
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* GROUP INFO MODAL (Manage Members) */}
            {showGroupInfo && (
                <Modal title="Grup Bilgileri" onClose={() => { setShowGroupInfo(false); setIsAddingMembers(false); }}>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-gray-800">Üyeler ({groupMembers.length})</h4>
                            <button
                                onClick={() => { setIsAddingMembers(!isAddingMembers); setSelectedUsers([]); }}
                                className="text-blue-600 text-sm font-medium hover:bg-blue-50 px-3 py-1 rounded-full transition flex items-center gap-1"
                            >
                                {isAddingMembers ? 'İptal' : <><UserPlus size={16} /> Üye Ekle</>}
                            </button>
                        </div>

                        {/* Status Toggle Button */}
                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <div className="text-sm text-gray-600">
                                Durum: <span className={`font-bold ${currentGroupDetails?.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                    {currentGroupDetails?.is_active ? 'AKTİF' : 'KAPALI'}
                                </span>
                            </div>
                            <button
                                onClick={handleToggleGroupStatus}
                                className={`text-xs px-3 py-1.5 rounded text-white font-medium ${currentGroupDetails?.is_active ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                            >
                                {currentGroupDetails?.is_active ? 'Grubu Kapat' : 'Aktifleştir'}
                            </button>
                        </div>

                        {/* Group Actions (Delete) */}
                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <div className="text-sm font-bold text-gray-700">Yönetim</div>
                            <button
                                onClick={handleDeleteGroup}
                                className="text-xs px-3 py-1.5 rounded text-white font-medium bg-red-600 hover:bg-red-700 flex items-center gap-1"
                            >
                                <Trash2 size={14} /> Grubu Sil
                            </button>
                        </div>

                        {/* Add Member Section */}
                        {isAddingMembers && (
                            <div className="bg-gray-50 p-3 rounded-lg border border-blue-100 animate-fade-in">
                                <p className="text-xs text-gray-500 mb-2 font-medium">Eklenecek üyeleri seçin:</p>
                                <div className="h-32 overflow-y-auto border border-gray-200 rounded-md bg-white p-1 mb-3 custom-scrollbar">
                                    {availableUsersToAdd.length > 0 ? availableUsersToAdd.map(u => (
                                        <div
                                            key={u.id}
                                            onClick={() => {
                                                if (selectedUsers.includes(u.id)) setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                                                else setSelectedUsers([...selectedUsers, u.id]);
                                            }}
                                            className={`flex items-center gap-2 p-2 rounded cursor-pointer ${selectedUsers.includes(u.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedUsers.includes(u.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                                {selectedUsers.includes(u.id) && <Check size={10} className="text-white" />}
                                            </div>
                                            <span className="text-sm">{u.full_name}</span>
                                        </div>
                                    )) : <p className="text-sm text-gray-400 p-2 text-center text-xs">Eklenebilecek personel bulunamadı.</p>}
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleAddMembers}
                                        disabled={selectedUsers.length === 0}
                                        className="bg-blue-600 text-white text-xs px-4 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        Ekle ({selectedUsers.length})
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Member List */}
                        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2">
                            {groupMembers.map((m, i) => (
                                <div key={i} className="flex items-center justify-between p-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                            {m.profile_photo
                                                ? <img src={`http://localhost:3000/${m.profile_photo}`} className="w-full h-full object-cover" />
                                                : <span className="text-xs font-bold text-gray-500">{getInitials(m.full_name)}</span>
                                            }
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-800">{m.full_name}</div>
                                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{m.role} {m.role === 'admin' ? '👑' : ''}</div>
                                        </div>
                                    </div>
                                    {m.user_id !== user.id && (
                                        <button
                                            onClick={() => handleRemoveMember(m.user_id)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Üyeyi Çıkar"
                                        >
                                            <UserMinus size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}

        </div>
    );
}
