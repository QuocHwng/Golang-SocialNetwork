import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import axiosClient from '../services/api/axiosClient';
import useAuthStore from '../store/useAuthStore';
import { Bell, LogOut, Search, UserCircle, MessageSquare, Sun, Moon, Settings, HelpCircle, ChevronDown, Users, Bookmark } from 'lucide-react';
// IMPORT LOGO KIWI CỦA BẠN VÀO ĐÂY
import logoImg from '../assets/logo.png';

const MainLayout = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

    useEffect(() => {
        if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); } 
        else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
    }, [isDarkMode]);

    useEffect(() => {
        axiosClient.get('/notifications').then(res => setNotifications(res.data.data || []));
        const token = localStorage.getItem('token');
        if (!token) return;

        const ws = new WebSocket(`ws://localhost:8080/api/v1/ws?token=${token}`);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.event === 'NEW_NOTIFICATION') axiosClient.get('/notifications').then(res => setNotifications(res.data.data || []));
            if (data.event === 'NEW_MESSAGE') window.dispatchEvent(new CustomEvent('new_message', { detail: data.message }));
            if (data.event === 'RECALL_MESSAGE') window.dispatchEvent(new CustomEvent('recall_message', { detail: data.message_id }));
            if (data.event === 'TYPING') window.dispatchEvent(new CustomEvent('typing', { detail: data.sender_id }));
            if (data.event === 'USER_ONLINE') window.dispatchEvent(new CustomEvent('user_online', { detail: data.user_id }));
            if (data.event === 'USER_OFFLINE') window.dispatchEvent(new CustomEvent('user_offline', { detail: data.user_id }));
        };
        return () => ws.close();
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) { setSearchResults([]); setShowSearch(false); return; }
        const timer = setTimeout(async () => {
            try { const res = await axiosClient.get(`/users/search?q=${searchQuery}`); setSearchResults(res.data.data || []); setShowSearch(true); } catch (error) {}
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleReadNotification = async (noti) => {
        if (!noti.is_read) {
            try { await axiosClient.put(`/notifications/${noti.id}/read`); setNotifications(notifications.map(n => n.id === noti.id ? { ...n, is_read: true } : n)); } catch (error) {}
        }
        setShowNotifications(false);
        if (noti.type === 'LIKE' || noti.type === 'COMMENT') navigate(`/post/${noti.entity_id}`);
        if (noti.type === 'FOLLOW') navigate(`/profile/${noti.actor.id}`);
    };

    const AvatarDisplay = ({ url, sizeClass }) => (
        url ? <img src={url} alt="ava" className={`${sizeClass} object-cover rounded-full border-2 border-white dark:border-stone-800 shadow-sm shrink-0`} /> 
            : <UserCircle className={`${sizeClass} text-stone-300 bg-white rounded-full shrink-0`} />
    );

    const closeAllMenus = () => { setShowNotifications(false); setShowSearch(false); setShowUserMenu(false); };

    return (
        // Đổi màu nền chính sang tone đá nhẹ (stone) thay vì xám cứng
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900 transition-colors duration-300 font-sans" onClick={closeAllMenus}>
            
            {/* THIẾT KẾ NAV NỔI (FLOATING NAVBAR) - KHÁC BIỆT HOÀN TOÀN FB */}
            <nav className="pt-4 px-4 sticky top-0 z-50">
                <div className="max-w-[1200px] mx-auto bg-white/80 dark:bg-stone-800/80 backdrop-blur-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-white/50 dark:border-stone-700/50 rounded-3xl px-6 py-2 flex justify-between items-center transition-all duration-300">
                    
                    {/* LOGO KIWI MỚI */}
                    <div className="flex items-center gap-6 flex-1">
                        <Link to="/" className="flex items-center gap-2 group">
                            <img src={logoImg} alt="Kiwi Logo" className="w-11 h-11 object-contain group-hover:rotate-12 transition-transform duration-300" />
                            <span className="hidden sm:block text-2xl font-black bg-gradient-to-r from-lime-500 to-emerald-500 bg-clip-text text-transparent">
                                KiwiSocial
                            </span>
                        </Link>
                        
                        {/* Thanh tìm kiếm bo tròn mạnh hơn, viền xanh nhẹ */}
                        <div className="relative flex-1 max-w-sm hidden md:block" onClick={e => e.stopPropagation()}>
                            <div className="relative group">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-lime-500 transition-colors" />
                                <input 
                                    type="text" 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                    onFocus={() => searchQuery && setShowSearch(true)} 
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && searchQuery.trim()) {
                                            setShowSearch(false);
                                            navigate(`/search?q=${searchQuery}`);
                                        }
                                    }}
                                    placeholder="Tìm kiếm trái kiwi nào..." 
                                    className="w-full bg-stone-100 dark:bg-stone-700 dark:text-white border-2 border-transparent rounded-full py-2.5 pl-11 pr-4 outline-none focus:border-lime-200 dark:focus:border-lime-500/50 focus:bg-white transition-all text-[15px]" 
                                />
                            </div>
                            {/* Dropdown tìm kiếm */}
                            {showSearch && (
                                <div className="absolute top-full left-0 mt-3 w-full bg-white dark:bg-stone-800 rounded-2xl shadow-xl border border-stone-100 dark:border-stone-700 overflow-hidden z-50">
                                    {searchResults.length === 0 ? <div className="p-4 text-center text-stone-500 text-sm">Không tìm thấy kết quả.</div> : searchResults.map(u => (
                                        <Link key={u.id} to={`/profile/${u.id}`} onClick={closeAllMenus} className="flex items-center gap-3 p-3 hover:bg-lime-50 dark:hover:bg-stone-700 transition">
                                            <AvatarDisplay url={u.avatar_url} sizeClass="w-10 h-10" />
                                            <span className="font-semibold text-stone-800 dark:text-stone-200">{u.full_name}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CÁC ICON CHỨC NĂNG - THEME LIME */}
                    <div className="flex items-center gap-1 sm:gap-3">

                        <Link to="/groups" className="w-11 h-11 bg-stone-100 dark:bg-stone-700 rounded-full flex justify-center items-center hover:bg-lime-100 hover:text-lime-600 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 transition-colors">
                            <Users size={20} className="fill-current" />
                        </Link>
                        <Link to="/chat" className="w-11 h-11 bg-stone-100 dark:bg-stone-700 rounded-full flex justify-center items-center hover:bg-lime-100 hover:text-lime-600 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 transition-colors">
                            <MessageSquare size={20} className="fill-current" />
                        </Link>

                        <div className="relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { closeAllMenus(); setShowNotifications(!showNotifications); }} className={`w-11 h-11 rounded-full flex justify-center items-center transition-colors ${showNotifications ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-600' : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-lime-100 hover:text-lime-600'}`}>
                                <Bell size={20} className={showNotifications ? 'fill-current' : 'fill-current'} />
                                {unreadCount > 0 && <span className="absolute top-0 right-0 bg-rose-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white translate-x-1/4 -translate-y-1/4">{unreadCount}</span>}
                            </button>
                            {/* Dropdown Thông báo */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-3 w-[360px] bg-white dark:bg-stone-800 rounded-3xl shadow-[0_10px_40px_rgb(0,0,0,0.08)] border border-stone-100 dark:border-stone-700 overflow-hidden z-50">
                                    <div className="p-5 flex justify-between items-center bg-stone-50 dark:bg-stone-800/50">
                                        <h2 className="font-bold text-xl text-stone-900 dark:text-white">Thông báo</h2>
                                    </div>
                                    <div className="max-h-[70vh] overflow-y-auto p-2 custom-scrollbar">
                                        {notifications.length === 0 ? <div className="p-4 text-center text-stone-500 text-sm">Chưa có thông báo nào.</div> : notifications.map(noti => (
                                            <div key={noti.id} onClick={() => handleReadNotification(noti)} className={`p-3 mb-1 rounded-2xl flex gap-4 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-700 transition ${!noti.is_read ? 'bg-lime-50/50 dark:bg-stone-700/50' : ''}`}>
                                                <div className="relative shrink-0 mt-1">
                                                    <AvatarDisplay url={noti.actor.avatar_url} sizeClass="w-12 h-12" />
                                                </div>
                                                <div className="flex-1 text-[14px] text-stone-700 dark:text-stone-300 leading-snug self-center">
                                                    <span className="font-bold text-stone-900 dark:text-white">{noti.actor.full_name}</span> 
                                                    {noti.type === 'LIKE' && ' đã thả tim bài viết của bạn. 💚'}
                                                    {noti.type === 'COMMENT' && ' đã bình luận về bài viết của bạn.'}
                                                    {noti.type === 'FOLLOW' && ' đã trở thành người theo dõi bạn.'}
                                                    <div className={`text-xs mt-1.5 ${!noti.is_read ? 'text-lime-600 font-bold' : 'text-stone-400'}`}>vài giờ trước</div>
                                                </div>
                                                {!noti.is_read && <div className="w-2.5 h-2.5 bg-lime-500 rounded-full self-center shrink-0 shadow-[0_0_8px_rgba(132,204,22,0.6)]"></div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* MENU TÀI KHOẢN BO TRÒN MỀM MẠI */}
                        <div className="relative ml-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { closeAllMenus(); setShowUserMenu(!showUserMenu); }} className="relative flex justify-center items-center group transition-transform hover:scale-105">
                                <AvatarDisplay url={user?.avatar_url} sizeClass="w-11 h-11" />
                            </button>

                            {showUserMenu && (
                                <div className="absolute right-0 mt-3 w-[320px] bg-white dark:bg-stone-800 rounded-3xl shadow-[0_10px_40px_rgb(0,0,0,0.08)] border border-stone-100 dark:border-stone-700 z-50 p-3">
                                    <Link to={`/profile/${user?.id}`} onClick={closeAllMenus} className="flex items-center gap-4 p-3 rounded-2xl bg-stone-50 dark:bg-stone-700/50 hover:bg-lime-50 dark:hover:bg-stone-700 transition group mb-2">
                                        <AvatarDisplay url={user?.avatar_url} sizeClass="w-12 h-12 group-hover:scale-105 transition-transform" />
                                        <div>
                                            <h3 className="font-bold text-stone-900 dark:text-white text-lg">{user?.full_name}</h3>
                                            <p className="text-sm text-lime-600 font-medium">Trang cá nhân của bạn</p>
                                        </div>
                                    </Link>

                                    <div className="space-y-1">
                                        <Link to="/saved" onClick={closeAllMenus} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 transition text-stone-700 dark:text-stone-200 font-medium">
                                            <div className="w-9 h-9 bg-stone-100 dark:bg-stone-600 rounded-full flex justify-center items-center text-stone-600 dark:text-stone-300"><Bookmark size={18} /></div>
                                            Bài viết đã lưu
                                        </Link>
                                        
                                        <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 transition text-stone-700 dark:text-stone-200 font-medium">
                                            <div className="w-9 h-9 bg-stone-100 dark:bg-stone-600 rounded-full flex justify-center items-center text-stone-600 dark:text-stone-300"><Settings size={18} /></div>
                                            Cài đặt & quyền riêng tư
                                        </button>
                                        
                                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 transition text-stone-700 dark:text-stone-200 font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-stone-100 dark:bg-stone-600 rounded-full flex justify-center items-center text-stone-600 dark:text-stone-300">
                                                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                                                </div>
                                                Giao diện
                                            </div>
                                        </button>

                                        <button onClick={logout} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 dark:hover:text-rose-400 transition text-stone-700 dark:text-stone-200 font-medium group">
                                            <div className="w-9 h-9 bg-stone-100 dark:bg-stone-600 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 rounded-full flex justify-center items-center text-stone-600 dark:text-stone-300 group-hover:text-rose-600"><LogOut size={18} /></div>
                                            Đăng xuất
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="pb-10 pt-4"><Outlet /></main>
        </div>
    );
};

export default MainLayout;