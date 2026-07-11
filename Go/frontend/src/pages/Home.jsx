import React, { useState, useEffect } from 'react';
import axiosClient from '../services/api/axiosClient';
import useAuthStore from '../store/useAuthStore';
import { Heart, MessageCircle, Share2, LogOut, UserCircle, Send, Bell } from 'lucide-react';

const Home = () => {
    const { user, logout } = useAuthStore();
    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [loading, setLoading] = useState(true);

    // --- State cho Bình luận ---
    const [activeCommentPostId, setActiveCommentPostId] = useState(null);
    const [comments, setComments] = useState({});
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);

    // --- State cho Thông báo (MỚI) ---
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    // TẢI BẢNG TIN VÀ THÔNG BÁO LẦN ĐẦU
    const fetchData = async () => {
        try {
            const [postsRes, notiRes] = await Promise.all([
                axiosClient.get('/posts'),
                axiosClient.get('/notifications')
            ]);
            setPosts(postsRes.data.data || []);
            setNotifications(notiRes.data.data || []);
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        } finally {
            setLoading(false);
        }
    };

    // KẾT NỐI WEBSOCKET (REAL-TIME)
    useEffect(() => {
        fetchData();

        const token = localStorage.getItem('token');
        if (!token) return;

        // Mở đường hầm WebSocket kết nối với Backend Go
        const ws = new WebSocket(`ws://localhost:8080/api/v1/ws?token=${token}`);

        // Lắng nghe tin nhắn từ Backend gửi tới
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.event === 'NEW_NOTIFICATION') {
                // Tải lại danh sách thông báo khi có event mới (để cập nhật cái chuông đỏ)
                axiosClient.get('/notifications').then(res => {
                    setNotifications(res.data.data || []);
                });
            }
        };

        // Cleanup: Đóng kết nối khi tắt web
        return () => ws.close();
    }, []);

    // --- CÁC HÀM XỬ LÝ POST / LIKE / COMMENT (Giữ nguyên như cũ) ---
    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!newPostContent.trim()) return;
        try {
            await axiosClient.post('/posts', { content: newPostContent });
            setNewPostContent('');
            fetchData(); 
        } catch (error) {
            alert('Đăng bài thất bại');
        }
    };

    const handleToggleLike = async (postId) => {
        try {
            const res = await axiosClient.post(`/posts/${postId}/like`);
            const isLiked = res.data.data.is_liked;
            setPosts(posts.map(post => post.id === postId ? { ...post, is_liked: isLiked, likes_count: isLiked ? post.likes_count + 1 : post.likes_count - 1 } : post));
        } catch (error) { console.error("Lỗi like:", error); }
    };

    const handleToggleComments = async (postId) => {
        if (activeCommentPostId === postId) {
            setActiveCommentPostId(null);
            return;
        }
        setActiveCommentPostId(postId);
        setLoadingComments(true);
        try {
            const res = await axiosClient.get(`/posts/${postId}/comments`);
            setComments(prev => ({ ...prev, [postId]: res.data.data || [] }));
        } catch (error) { console.error("Lỗi tải comment", error); } finally { setLoadingComments(false); }
    };

    const handleSendComment = async (e, postId) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            const res = await axiosClient.post(`/posts/${postId}/comments`, { content: newComment });
            const addedComment = { ...res.data.data, author: { full_name: user.full_name, avatar_url: user.avatar_url } };
            setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), addedComment] }));
            setNewComment('');
            setPosts(posts.map(post => post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post));
        } catch (error) { alert('Lỗi gửi bình luận'); }
    };

    // --- HÀM XỬ LÝ ĐỌC THÔNG BÁO ---
    const handleReadNotification = async (noti) => {
        if (!noti.is_read) {
            try {
                await axiosClient.put(`/notifications/${noti.id}/read`);
                // Cập nhật lại list thông báo cục bộ (tắt màu xanh chưa đọc)
                setNotifications(notifications.map(n => n.id === noti.id ? { ...n, is_read: true } : n));
            } catch (error) {
                console.error("Lỗi đọc thông báo", error);
            }
        }
        setShowNotifications(false); // Bấm xong thì đóng menu dropdown lại
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('vi-VN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-gray-100 pb-10 relative">
            {/* Navbar */}
            <nav className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-blue-600">Mạng Xã Hội</h1>
                    <div className="flex items-center gap-4">
                        
                        {/* 🔔 CHUÔNG THÔNG BÁO */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)} 
                                className="relative p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 transition"
                            >
                                <Bell size={20} />
                                {/* Chấm đỏ hiển thị số lượng chưa đọc */}
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white translate-x-1/4 -translate-y-1/4">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Menu Dropdown Thông Báo */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                                    <div className="p-3 border-b bg-gray-50 font-bold text-gray-700">Thông báo của bạn</div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-4 text-center text-gray-500 text-sm">Không có thông báo nào.</div>
                                        ) : (
                                            notifications.map(noti => (
                                                <div 
                                                    key={noti.id} 
                                                    onClick={() => handleReadNotification(noti)} 
                                                    className={`p-3 border-b flex gap-3 cursor-pointer hover:bg-gray-50 transition ${!noti.is_read ? 'bg-blue-50' : ''}`}
                                                >
                                                    <UserCircle size={32} className="text-gray-400 shrink-0 mt-1" />
                                                    <div className="text-sm text-gray-800">
                                                        <span className="font-bold">{noti.actor.full_name}</span> 
                                                        {noti.type === 'LIKE' && ' đã thích bài viết của bạn.'}
                                                        {noti.type === 'COMMENT' && ' đã bình luận bài viết của bạn.'}
                                                        {noti.type === 'FOLLOW' && ' đã bắt đầu theo dõi bạn.'}
                                                        <div className="text-xs text-gray-500 mt-1">{formatDate(noti.created_at)}</div>
                                                    </div>
                                                    {/* Nút xanh báo hiệu chưa đọc */}
                                                    {!noti.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></div>}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <span className="font-semibold text-gray-700 hidden sm:block">Chào, {user?.full_name}</span>
                        <button onClick={logout} className="p-2 bg-gray-100 rounded-full hover:bg-red-100 text-red-500 transition" title="Đăng xuất">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-2xl mx-auto mt-6 px-4 space-y-6" onClick={() => setShowNotifications(false)}>
                {/* Khu vực Đăng Bài */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-3">
                        <UserCircle size={40} className="text-gray-400" />
                        <form onSubmit={handleCreatePost} className="flex-1">
                            <textarea
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder={`${user?.full_name} ơi, bạn đang nghĩ gì thế?`}
                                className="w-full bg-gray-100 rounded-xl p-3 outline-none resize-none focus:ring-2 focus:ring-blue-200"
                                rows="3"
                            ></textarea>
                            <div className="flex justify-end mt-3">
                                <button type="submit" disabled={!newPostContent.trim()} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
                                    Đăng bài
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Bảng Tin (News Feed) */}
                {loading ? (
                    <p className="text-center text-gray-500 mt-10">Đang tải bảng tin...</p>
                ) : posts.length === 0 ? (
                    <p className="text-center text-gray-500 mt-10">Chưa có bài viết nào.</p>
                ) : (
                    posts.map((post) => (
                        <div key={post.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-3">
                                <UserCircle size={40} className="text-gray-400" />
                                <div>
                                    <h3 className="font-bold text-gray-900">{post.author.full_name}</h3>
                                    <p className="text-xs text-gray-500">{formatDate(post.created_at)}</p>
                                </div>
                            </div>

                            <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>

                            {post.shared_post && (
                                <div className="mt-3 p-3 border rounded-xl bg-gray-50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <UserCircle size={24} className="text-gray-400" />
                                        <span className="font-semibold text-sm">{post.shared_post.author.full_name}</span>
                                    </div>
                                    <p className="text-sm text-gray-700">{post.shared_post.content}</p>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-gray-500 text-sm mt-4 border-b pb-2">
                                <span>{post.likes_count} lượt thích</span>
                                <div className="flex gap-4">
                                    <span className="cursor-pointer hover:underline" onClick={() => handleToggleComments(post.id)}>
                                        {post.comments_count} bình luận
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <button onClick={() => handleToggleLike(post.id)} className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-lg hover:bg-gray-100 font-medium transition ${post.is_liked ? 'text-red-500' : 'text-gray-600'}`}>
                                    <Heart size={20} className={post.is_liked ? 'fill-red-500 text-red-500' : ''} /> Thích
                                </button>
                                <button onClick={() => handleToggleComments(post.id)} className="flex-1 flex justify-center items-center gap-2 py-2 rounded-lg hover:bg-gray-100 text-gray-600 font-medium transition">
                                    <MessageCircle size={20} /> Bình luận
                                </button>
                                <button className="flex-1 flex justify-center items-center gap-2 py-2 rounded-lg hover:bg-gray-100 text-gray-600 font-medium transition">
                                    <Share2 size={20} /> Chia sẻ
                                </button>
                            </div>

                            {activeCommentPostId === post.id && (
                                <div className="mt-4 border-t pt-4">
                                    {loadingComments ? (
                                        <p className="text-center text-sm text-gray-400">Đang tải...</p>
                                    ) : (
                                        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                                            {(comments[post.id] || []).length === 0 ? (
                                                <p className="text-center text-sm text-gray-400">Chưa có bình luận nào.</p>
                                            ) : (
                                                (comments[post.id] || []).map(cmt => (
                                                    <div key={cmt.id} className="flex gap-2">
                                                        <UserCircle size={32} className="text-gray-400 shrink-0 mt-1" />
                                                        <div className="bg-gray-100 px-4 py-2 rounded-2xl max-w-[85%]">
                                                            <span className="font-semibold text-sm text-gray-900 block">{cmt.author.full_name}</span>
                                                            <span className="text-gray-800 text-sm">{cmt.content}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                    <form onSubmit={(e) => handleSendComment(e, post.id)} className="flex gap-2 items-center">
                                        <UserCircle size={36} className="text-gray-400 shrink-0" />
                                        <div className="flex-1 relative">
                                            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Viết bình luận..." className="w-full bg-gray-100 border-none rounded-full py-2 pl-4 pr-10 outline-none focus:ring-2 focus:ring-blue-200" />
                                            <button type="submit" disabled={!newComment.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700 disabled:text-gray-300"><Send size={18} /></button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </main>
        </div>
    );
};

export default Home;