import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import axiosClient from '../services/api/axiosClient';
import useAuthStore from '../store/useAuthStore';
import { Bell, LogOut, Search, UserCircle, Home } from 'lucide-react';

const MainLayout = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    // --- State Thông báo & WebSocket ---
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    // --- State Tìm kiếm ---
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearch, setShowSearch] = useState(false);

    useEffect(() => {
        axiosClient.get('/notifications').then(res => setNotifications(res.data.data || []));

        const token = localStorage.getItem('token');
        if (!token) return;

        const ws = new WebSocket(`ws://localhost:8080/api/v1/ws?token=${token}`);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.event === 'NEW_NOTIFICATION') {
                axiosClient.get('/notifications').then(res => setNotifications(res.data.data || []));
            }
        };
        return () => ws.close();
    }, []);

    // Hiệu ứng "Gõ xong mới tìm" (Debounce Search)
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setShowSearch(false);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await axiosClient.get(`/users/search?q=${searchQuery}`);
                setSearchResults(res.data.data || []);
                setShowSearch(true);
            } catch (error) { console.error("Lỗi tìm kiếm", error); }
        }, 300); // Đợi 0.3s sau khi ngừng gõ mới gọi API
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleReadNotification = async (noti) => {
        if (!noti.is_read) {
            try {
                await axiosClient.put(`/notifications/${noti.id}/read`);
                setNotifications(notifications.map(n => n.id === noti.id ? { ...n, is_read: true } : n));
            } catch (error) {}
        }
        setShowNotifications(false);
        if (noti.type === 'LIKE' || noti.type === 'COMMENT') navigate(`/post/${noti.entity_id}`);
        if (noti.type === 'FOLLOW') navigate(`/profile/${noti.actor.id}`);
    };

    return (
        <div className="min-h-screen bg-gray-100" onClick={() => { setShowNotifications(false); setShowSearch(false); }}>
            {/* Thanh Navbar Dùng Chung */}
            <nav className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
                    
                    {/* Logo & Search */}
                    <div className="flex items-center gap-6 flex-1">
                        <Link to="/" className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                            <Home size={28} /> MXH
                        </Link>
                        
                        {/* THANH TÌM KIẾM */}
                        <div className="relative flex-1 max-w-sm hidden sm:block" onClick={e => e.stopPropagation()}>
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => searchQuery && setShowSearch(true)}
                                    placeholder="Tìm kiếm mọi người..." 
                                    className="w-full bg-gray-100 border-none rounded-full py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>

                            {/* Dropdown Kết quả tìm kiếm */}
                            {showSearch && (
                                <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border overflow-hidden z-50">
                                    {searchResults.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500 text-sm">Không tìm thấy ai.</div>
                                    ) : (
                                        searchResults.map(u => (
                                            <Link 
                                                key={u.id} 
                                                to={`/profile/${u.id}`}
                                                onClick={() => setShowSearch(false)}
                                                className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-none transition"
                                            >
                                                <UserCircle size={36} className="text-gray-400" />
                                                <span className="font-semibold text-gray-800">{u.full_name}</span>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Menu Phải */}
                    <div className="flex items-center gap-4">
                        {/* Nút Thông báo */}
                        <div className="relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 transition">
                                <Bell size={20} />
                                {unreadCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white translate-x-1/4 -translate-y-1/4">{unreadCount}</span>}
                            </button>
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border overflow-hidden z-50">
                                    <div className="p-3 border-b bg-gray-50 font-bold text-gray-700">Thông báo</div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? <div className="p-4 text-center text-gray-500 text-sm">Trống.</div> : notifications.map(noti => (
                                            <div key={noti.id} onClick={() => handleReadNotification(noti)} className={`p-3 border-b flex gap-3 cursor-pointer hover:bg-gray-50 transition ${!noti.is_read ? 'bg-blue-50' : ''}`}>
                                                <UserCircle size={32} className="text-gray-400 shrink-0 mt-1" />
                                                <div className="text-sm text-gray-800">
                                                    <span className="font-bold">{noti.actor.full_name}</span> 
                                                    {noti.type === 'LIKE' && ' đã thích bài viết của bạn.'}
                                                    {noti.type === 'COMMENT' && ' đã bình luận bài viết của bạn.'}
                                                    {noti.type === 'FOLLOW' && ' đã theo dõi bạn.'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Link tới Trang cá nhân của TÔI */}
                        <Link to={`/profile/${user?.id}`} className="flex items-center gap-2 font-semibold text-gray-700 hover:text-blue-600 transition hidden sm:flex">
                            <UserCircle size={24} /> {user?.full_name}
                        </Link>
                        
                        <button onClick={logout} className="p-2 bg-gray-100 rounded-full hover:bg-red-100 text-red-500 transition"><LogOut size={20} /></button>
                    </div>
                </div>
            </nav>

            {/* Nơi chứa nội dung các trang con (Home, Profile...) */}
            <main className="pb-10">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;