import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../services/api/axiosClient';
import useAuthStore from '../store/useAuthStore';
import { UserCircle, UserPlus, UserCheck, Heart, MessageCircle, Share2, Send, Image as ImageIcon, X, Trash2, Edit3, Camera, Loader2, MessageSquare, MoreHorizontal, Check, Smile, MapPin, Globe } from 'lucide-react';

const Profile = () => {
    const { id } = useParams();
    const { user: currentUser, updateUser } = useAuthStore();
    const navigate = useNavigate();
    
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const isMyProfile = currentUser?.id === id;

    // --- State cho Cuộn vô tận ---
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // --- STATE CHO MODAL TẠO BÀI/SHARE ---
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [postMode, setPostMode] = useState('create'); 
    const [postToShare, setPostToShare] = useState(null);

    const [newPostContent, setNewPostContent] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // --- State cho Bình luận ---
    const [activeCommentPostId, setActiveCommentPostId] = useState(null);
    const [comments, setComments] = useState({});
    const [newComment, setNewComment] = useState('');

    // --- State cho Edit Profile ---
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ full_name: '', bio: '', avatar_url: '' });
    const avatarInputRef = useRef(null);

    const [openPostMenuId, setOpenPostMenuId] = useState(null);
    const [editingPostId, setEditingPostId] = useState(null);
    const [editPostContent, setEditPostContent] = useState('');
    const [openCommentMenuId, setOpenCommentMenuId] = useState(null);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editCommentContent, setEditCommentContent] = useState('');

    useEffect(() => {
        const handleClickOutside = () => { setOpenPostMenuId(null); setOpenCommentMenuId(null); };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // 1. TẢI DỮ LIỆU USER
    useEffect(() => {
        axiosClient.get(`/users/${id}`)
            .then(res => {
                setProfile(res.data.data);
                setEditData({ full_name: res.data.data.full_name, bio: res.data.data.bio || '', avatar_url: res.data.data.avatar_url || '' });
            })
            .catch(err => console.error("Lỗi tải thông tin user"));
    }, [id]);

    // 2. TẢI BÀI VIẾT (Cuộn vô tận)
    const fetchUserPosts = async (pageNum) => {
        if (pageNum === 1) setLoading(true); else setLoadingMore(true);
        try {
            const res = await axiosClient.get(`/users/${id}/posts?page=${pageNum}&limit=5`);
            const newPosts = res.data.data || [];
            if (pageNum === 1) setPosts(newPosts); else setPosts(prev => [...prev, ...newPosts]);
            setHasMore(newPosts.length === 5);
        } catch (error) { console.error("Lỗi tải bài viết"); } 
        finally { setLoading(false); setLoadingMore(false); }
    };

    useEffect(() => { setPage(1); fetchUserPosts(1); }, [id]);

    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) {
                if (hasMore && !loading && !loadingMore) setPage(prev => prev + 1);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasMore, loading, loadingMore]);

    useEffect(() => { if (page > 1) fetchUserPosts(page); }, [page]);

    // 3. CÁC HÀM XỬ LÝ PROFILE
    const handleToggleFollow = async () => {
        try {
            const res = await axiosClient.post(`/users/${id}/follow`);
            const isFollowing = res.data.data.is_following;
            setProfile(prev => ({ ...prev, is_following: isFollowing, followers_count: isFollowing ? prev.followers_count + 1 : prev.followers_count - 1 }));
        } catch (error) {}
    };

    const handleSaveProfile = async () => {
        try {
            const payload = { ...editData, avatar_url: editData.avatar_url || null };
            const res = await axiosClient.put('/profile', payload);
            setProfile({ ...profile, ...payload });
            updateUser(res.data.data); 
            setIsEditing(false);
        } catch (error) { alert("Lỗi lưu thông tin"); }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData(); formData.append('file', file);
        try {
            const res = await axiosClient.post('/upload', formData); 
            setEditData({ ...editData, avatar_url: res.data.data.url });
        } catch (error) { alert("Lỗi upload ảnh"); }
    };

    // 4. HÀM XỬ LÝ MODAL (ĐĂNG BÀI / CHIA SẺ)
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files]);
        setPreviews(prev => [...prev, ...files.map(file => URL.createObjectURL(file))]);
    };
    const removeFile = (i) => {
        setSelectedFiles(prev => prev.filter((_, index) => index !== i));
        setPreviews(prev => prev.filter((_, index) => index !== i));
    };

    const openCreateModal = () => {
        setPostMode('create'); setPostToShare(null); setNewPostContent('');
        setSelectedFiles([]); setPreviews([]); setIsPostModalOpen(true);
    };

    const openShareModal = (post) => {
        setPostMode('share'); setPostToShare(post); setNewPostContent('');
        setSelectedFiles([]); setPreviews([]); setIsPostModalOpen(true);
    };

    const closePostModal = () => setIsPostModalOpen(false);

    const handleSubmitModal = async (e) => {
        e.preventDefault();
        if (!newPostContent.trim() && selectedFiles.length === 0 && postMode === 'create') return;
        setUploading(true);

        try {
            if (postMode === 'create') {
                let mediaUrls = [];
                for (let file of selectedFiles) {
                    const fd = new FormData(); fd.append('file', file);
                    const res = await axiosClient.post('/upload', fd);
                    mediaUrls.push(res.data.data.url);
                }
                await axiosClient.post('/posts', { content: newPostContent, media_urls: mediaUrls });
            } else {
                const targetShareId = postToShare.shared_post ? postToShare.shared_post.id : postToShare.id;
                await axiosClient.post('/posts', { content: newPostContent, shared_post_id: targetShareId });
                alert("Đã chia sẻ bài viết lên tường của bạn!");
            }
            
            closePostModal();
            // Nếu là trang nhà mình thì load lại để thấy bài mới/bài share
            if (isMyProfile) {
                setPage(1); fetchUserPosts(1); 
            }
        } catch (error) { alert('Thao tác thất bại'); } finally { setUploading(false); }
    };

    // 5. CÁC HÀM TƯƠNG TÁC
    const handleDeletePost = async (postId) => {
        if (!window.confirm("Bạn có chắc muốn xóa?")) return;
        try { await axiosClient.delete(`/posts/${postId}`); setPosts(posts.filter(p => p.id !== postId)); } catch (error) {}
    };

    const handleUpdatePost = async (postId) => {
        try { await axiosClient.put(`/posts/${postId}`, { content: editPostContent }); setPosts(posts.map(p => p.id === postId ? { ...p, content: editPostContent } : p)); setEditingPostId(null); } catch (error) {}
    };

    const handleToggleLike = async (postId) => {
        try {
            const res = await axiosClient.post(`/posts/${postId}/like`);
            const isLiked = res.data.data.is_liked;
            setPosts(posts.map(p => p.id === postId ? { ...p, is_liked: isLiked, likes_count: isLiked ? p.likes_count + 1 : p.likes_count - 1 } : p));
        } catch (error) {}
    };

    const handleToggleComments = async (postId) => {
        if (activeCommentPostId === postId) { setActiveCommentPostId(null); return; }
        setActiveCommentPostId(postId);
        try { const res = await axiosClient.get(`/posts/${postId}/comments`); setComments(prev => ({ ...prev, [postId]: res.data.data || [] })); } catch (error) {}
    };

    const handleSendComment = async (e, postId) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            const res = await axiosClient.post(`/posts/${postId}/comments`, { content: newComment });
            const added = { ...res.data.data, author: { id: currentUser.id, full_name: currentUser.full_name, avatar_url: currentUser.avatar_url } };
            setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), added] }));
            setNewComment('');
            setPosts(posts.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
        } catch (error) {}
    };

    const handleDeleteComment = async (commentId, postId) => {
        if (!window.confirm("Xóa bình luận này?")) return;
        try { await axiosClient.delete(`/comments/${commentId}`); setComments(prev => ({ ...prev, [postId]: prev[postId].filter(c => c.id !== commentId) })); setPosts(posts.map(p => p.id === postId ? { ...p, comments_count: p.comments_count - 1 } : p)); } catch (error) {}
    };

    const handleUpdateComment = async (commentId, postId) => {
        try { await axiosClient.put(`/comments/${commentId}`, { content: editCommentContent }); setComments(prev => ({ ...prev, [postId]: prev[postId].map(c => c.id === commentId ? { ...c, content: editCommentContent } : c) })); setEditingCommentId(null); } catch (error) {}
    };

    const AvatarDisplay = ({ url, sizeClass }) => (
        url ? <img src={url} alt="ava" className={`${sizeClass} object-cover rounded-full border-2 border-white dark:border-stone-800 shadow-sm shrink-0`} /> 
            : <UserCircle className={`${sizeClass} text-stone-300 bg-white rounded-full shrink-0`} />
    );

    if (loading && posts.length === 0 && !profile) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-lime-500" size={32} /></div>;
    if (!profile) return <div className="text-center pt-20 text-rose-500 font-bold">Người dùng không tồn tại!</div>;

    return (
        <div className="max-w-4xl mx-auto pb-10 px-4 sm:px-0 mt-4">
            {/* THÔNG TIN CHUNG TRANG CÁ NHÂN */}
            <div className="bg-white dark:bg-stone-800 shadow-sm rounded-b-[2.5rem] overflow-hidden border border-stone-100 dark:border-stone-700 relative transition-colors">
                <div className="h-56 bg-gradient-to-r from-lime-400 to-emerald-500 dark:from-lime-600 dark:to-emerald-800"></div>
                <div className="px-6 md:px-10 pb-6 flex flex-col md:flex-row md:justify-between md:items-end relative -mt-20 md:-mt-16 gap-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div className="bg-white dark:bg-stone-800 p-1.5 rounded-full shadow-lg relative group inline-block">
                            <AvatarDisplay url={profile.avatar_url} sizeClass="w-36 h-36" />
                            {isMyProfile && (
                                <div onClick={() => setIsEditing(true)} className="absolute top-1.5 left-1.5 w-36 h-36 bg-black/60 rounded-full flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                                    <Camera size={32} className="text-white mb-1" />
                                    <span className="text-white text-[11px] font-bold uppercase tracking-widest">Cập nhật</span>
                                </div>
                            )}
                        </div>
                        <div className="mb-2 text-center md:text-left">
                            <h1 className="text-3xl font-black text-stone-900 dark:text-white">{profile.full_name}</h1>
                            <p className="text-stone-500 dark:text-stone-400 font-medium">@{profile.username}</p>
                            {profile.bio && <p className="text-stone-700 dark:text-stone-300 mt-2 max-w-md bg-stone-50 dark:bg-stone-700/50 p-3 rounded-2xl inline-block text-sm">{profile.bio}</p>}
                        </div>
                    </div>

                    {!isMyProfile && (
                        <div className="flex gap-2 justify-center md:mb-4">
                            <button onClick={() => navigate('/chat', { state: { contact: profile } })} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold transition shadow-sm bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100">
                                <MessageSquare size={20} /> Nhắn tin
                            </button>
                            <button onClick={handleToggleFollow} className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition shadow-sm ${profile.is_following ? 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-300' : 'bg-lime-500 text-white hover:bg-lime-600 shadow-[0_4px_14px_rgba(132,204,22,0.39)]'}`}>
                                {profile.is_following ? <UserCheck size={20} /> : <UserPlus size={20} />} {profile.is_following ? 'Đang theo dõi' : 'Theo dõi'}
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="px-6 md:px-10 py-5 border-t border-stone-100 dark:border-stone-700 flex justify-center md:justify-start gap-8 text-stone-600 dark:text-stone-400 bg-stone-50/50 dark:bg-stone-800/50">
                    <div className="text-center md:text-left"><strong className="text-stone-900 dark:text-white text-lg block md:inline">{profile.followers_count}</strong> <span className="text-sm md:text-base">Người theo dõi</span></div>
                    <div className="text-center md:text-left"><strong className="text-stone-900 dark:text-white text-lg block md:inline">{profile.following_count}</strong> <span className="text-sm md:text-base">Đang theo dõi</span></div>
                    <div className="text-center md:text-left"><strong className="text-stone-900 dark:text-white text-lg block md:inline">{posts.length}</strong> <span className="text-sm md:text-base">Bài viết</span></div>
                </div>
            </div>

            {/* MODAL SỬA THÔNG TIN */}
            {isEditing && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl w-full max-w-md shadow-2xl relative border dark:border-stone-700">
                        <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 dark:hover:text-white bg-stone-100 dark:bg-stone-700 p-2 rounded-full"><X size={20} /></button>
                        <h2 className="text-2xl font-black mb-6 text-stone-900 dark:text-white text-center">Chỉnh sửa hồ sơ</h2>
                        
                        <div className="flex flex-col items-center gap-3 mb-6">
                            <div className="relative group">
                                <AvatarDisplay url={editData.avatar_url} sizeClass="w-28 h-28" />
                                <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/50 text-white flex justify-center items-center rounded-full opacity-0 group-hover:opacity-100 transition backdrop-blur-sm"><Camera size={28} /></button>
                                <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                            </div>
                            <button onClick={() => setEditData({...editData, avatar_url: ''})} className="text-sm text-rose-500 font-semibold hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-1 rounded-full transition">Gỡ ảnh hiện tại</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-stone-700 dark:text-stone-300 ml-1">Họ và Tên</label>
                                <input type="text" value={editData.full_name} onChange={e => setEditData({...editData, full_name: e.target.value})} className="w-full bg-stone-50 dark:bg-stone-700 dark:text-white border-2 border-transparent rounded-2xl p-3 mt-1 outline-none focus:border-lime-500 transition" />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-stone-700 dark:text-stone-300 ml-1">Tiểu sử (Bio)</label>
                                <textarea value={editData.bio} onChange={e => setEditData({...editData, bio: e.target.value})} className="w-full bg-stone-50 dark:bg-stone-700 dark:text-white border-2 border-transparent rounded-2xl p-3 mt-1 resize-none h-24 outline-none focus:border-lime-500 transition" placeholder="Viết gì đó về bạn..."></textarea>
                            </div>
                            <button onClick={handleSaveProfile} className="w-full bg-lime-500 text-white font-bold py-3.5 rounded-2xl hover:bg-lime-600 transition shadow-[0_4px_14px_rgba(132,204,22,0.39)] mt-2">Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-2xl mx-auto mt-6 space-y-6">
                
                {/* KHU VỰC "BẠN ĐANG NGHĨ GÌ" (Chỉ hiện nếu là nhà mình) */}
                {isMyProfile && (
                    <div className="bg-white dark:bg-stone-800 p-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-stone-100 dark:border-stone-700 transition-colors">
                        <div className="flex gap-3 items-center">
                            <AvatarDisplay url={currentUser?.avatar_url} sizeClass="w-10 h-10" />
                            <button onClick={openCreateModal} className="flex-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 dark:text-stone-300 text-stone-500 text-left px-5 py-3 rounded-full transition-colors text-[16px]">
                                Đăng một bài viết mới...
                            </button>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
                            <button onClick={openCreateModal} className="flex-1 flex justify-center items-center gap-2 py-2 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-xl text-stone-600 dark:text-stone-300 font-semibold transition"><ImageIcon size={24} className="text-lime-500" /> Ảnh/Video</button>
                            <button onClick={openCreateModal} className="flex-1 flex justify-center items-center gap-2 py-2 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-xl text-stone-600 dark:text-stone-300 font-semibold transition"><Smile size={24} className="text-yellow-500" /> Cảm xúc</button>
                        </div>
                    </div>
                )}

                {/* DANH SÁCH BÀI VIẾT */}
                {posts.length > 0 && <h3 className="text-xl font-black text-stone-800 dark:text-stone-200 mb-4 px-2">Bài viết của {profile.full_name}</h3>}
                
                {posts.length === 0 ? (
                    <div className="bg-white dark:bg-stone-800 p-10 text-center rounded-3xl border dark:border-stone-700 text-stone-500 font-medium">Chưa có bài viết nào.</div>
                ) : (
                    posts.map(post => (
                        <div key={post.id} className="bg-white dark:bg-stone-800 p-5 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-stone-100 dark:border-stone-700 transition-colors">
                            
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-3 items-center">
                                    <AvatarDisplay url={post.author?.avatar_url} sizeClass="w-12 h-12 shadow-sm" />
                                    <div>
                                        <h3 className="font-bold text-stone-900 dark:text-stone-100 text-[16px]">{post.author?.full_name}</h3>
                                        <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                            <span>{new Date(post.created_at).toLocaleString('vi-VN')}</span>
                                            <span>•</span><Globe size={12} />
                                        </div>
                                    </div>
                                </div>
                                {isMyProfile && (
                                    <div className="relative">
                                        <button onClick={(e) => { e.stopPropagation(); setOpenPostMenuId(openPostMenuId === post.id ? null : post.id); }} className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"><MoreHorizontal size={20} /></button>
                                        {openPostMenuId === post.id && (
                                            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-2xl shadow-xl overflow-hidden z-10 p-2" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => { setEditingPostId(post.id); setEditPostContent(post.content); setOpenPostMenuId(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-xl transition"><Edit3 size={16} /> Chỉnh sửa</button>
                                                <button onClick={() => { handleDeletePost(post.id); setOpenPostMenuId(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition"><Trash2 size={16} /> Xóa bài</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {editingPostId === post.id ? (
                                <div className="mb-4">
                                    <textarea value={editPostContent} onChange={(e) => setEditPostContent(e.target.value)} className="w-full border-2 border-lime-200 dark:border-stone-600 dark:bg-stone-700 dark:text-white rounded-2xl p-4 outline-none focus:border-lime-500 resize-none text-[16px]" rows="3" autoFocus />
                                    <div className="flex justify-end gap-2 mt-3">
                                        <button onClick={() => setEditingPostId(null)} className="px-5 py-2 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200 font-bold transition">Hủy</button>
                                        <button onClick={() => handleUpdatePost(post.id)} disabled={!editPostContent.trim()} className="px-5 py-2 rounded-xl bg-lime-500 text-white hover:bg-lime-600 font-bold flex items-center gap-2 transition shadow-md"><Check size={18} /> Lưu lại</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-stone-800 dark:text-stone-200 whitespace-pre-wrap text-[16px] leading-relaxed mb-4">{post.content}</p>
                            )}

                            {post.media && post.media.length > 0 && (
                                <div className={`grid gap-2 mb-4 ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                    {post.media.map(m => ( m.media_type === 'video' ? <video key={m.id} controls className="w-full rounded-2xl max-h-[500px] object-cover bg-black"><source src={m.media_url} /></video> : <img key={m.id} src={m.media_url} alt="media" className="w-full rounded-2xl max-h-[500px] object-cover border border-stone-100 dark:border-stone-700" /> ))}
                                </div>
                            )}

                            {/* HIỂN THỊ BÀI SHARE */}
                            {post.shared_post && (
                                <div className="mt-3 p-4 border border-stone-200 dark:border-stone-700 rounded-2xl bg-stone-50/50 dark:bg-stone-700/30 mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AvatarDisplay url={post.shared_post.author?.avatar_url} sizeClass="w-6 h-6" />
                                        <span className="font-bold text-[14px] text-stone-800 dark:text-stone-200">{post.shared_post.author?.full_name}</span>
                                    </div>
                                    <p className="text-[15px] text-stone-700 dark:text-stone-300">{post.shared_post.content}</p>
                                    {post.shared_post.media && post.shared_post.media.length > 0 && (
                                        <img src={post.shared_post.media[0].media_url} className="mt-2 rounded-xl max-h-40 object-cover" alt="shared" />
                                    )}
                                </div>
                            )}

                            <div className="flex justify-between items-center text-stone-500 dark:text-stone-400 text-[15px] pb-3 border-b border-stone-100 dark:border-stone-700">
                                <span className="flex items-center gap-1.5"><Heart size={16} className="fill-lime-500 text-lime-500" /> {post.likes_count}</span>
                                <div className="flex gap-4">
                                    <span className="cursor-pointer hover:underline" onClick={() => handleToggleComments(post.id)}>{post.comments_count} bình luận</span>
                                    <span>{post.shares_count} chia sẻ</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-3 gap-2">
                                <button onClick={() => handleToggleLike(post.id)} className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 transition font-semibold ${post.is_liked ? 'text-lime-600 dark:text-lime-400' : 'text-stone-600 dark:text-stone-400'}`}>
                                    <Heart size={20} className={post.is_liked ? 'fill-current' : ''} /> Thích
                                </button>
                                <button onClick={() => handleToggleComments(post.id)} className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 font-semibold transition">
                                    <MessageCircle size={20} /> Bình luận
                                </button>
                                <button onClick={() => openShareModal(post)} className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 font-semibold transition">
                                    <Share2 size={20} /> Chia sẻ
                                </button>
                            </div>

                            {/* KHU VỰC BÌNH LUẬN NÂNG CẤP */}
                            {activeCommentPostId === post.id && (
                                <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-700">
                                    <div className="space-y-4 mb-5 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                        {(comments[post.id] || []).map(cmt => (
                                            <div key={cmt.id} className="flex gap-3 group">
                                                <AvatarDisplay url={cmt.author?.avatar_url} sizeClass="w-9 h-9 shrink-0 mt-1" />
                                                <div className="flex-1">
                                                    {editingCommentId === cmt.id ? (
                                                        <div className="bg-stone-50 dark:bg-stone-700 p-3 rounded-2xl border border-lime-200 dark:border-stone-600">
                                                            <input type="text" value={editCommentContent} onChange={(e) => setEditCommentContent(e.target.value)} className="w-full bg-transparent border-b-2 border-lime-400 dark:border-lime-500 dark:text-white outline-none px-2 py-1 mb-3 text-[15px]" autoFocus />
                                                            <div className="flex justify-end gap-3">
                                                                <button onClick={() => setEditingCommentId(null)} className="text-sm font-bold text-stone-500 dark:text-stone-400 hover:text-stone-700">Hủy</button>
                                                                <button onClick={() => handleUpdateComment(cmt.id, post.id)} className="text-sm font-bold text-lime-600 dark:text-lime-400 hover:text-lime-700">Lưu thay đổi</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className="bg-stone-100 dark:bg-stone-700 px-4 py-2.5 rounded-2xl inline-block max-w-[85%]">
                                                                <span className="font-bold text-[14px] text-stone-900 dark:text-stone-100 block mb-0.5">{cmt.author?.full_name}</span>
                                                                <span className="text-stone-800 dark:text-stone-200 text-[15px]">{cmt.content}</span>
                                                            </div>
                                                            {currentUser?.id === cmt.author?.id && (
                                                                <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={(e) => { e.stopPropagation(); setOpenCommentMenuId(openCommentMenuId === cmt.id ? null : cmt.id); }} className="p-1.5 text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 rounded-full hover:bg-stone-200 dark:hover:bg-stone-600"><MoreHorizontal size={18} /></button>
                                                                    {openCommentMenuId === cmt.id && (
                                                                        <div className="absolute left-0 mt-1 w-32 bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl shadow-lg overflow-hidden z-10 p-1.5" onClick={(e) => e.stopPropagation()}>
                                                                            <button onClick={() => { setEditingCommentId(cmt.id); setEditCommentContent(cmt.content); setOpenCommentMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-lg">Chỉnh sửa</button>
                                                                            <button onClick={() => { handleDeleteComment(cmt.id, post.id); setOpenCommentMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">Xóa</button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <form onSubmit={(e) => handleSendComment(e, post.id)} className="flex gap-3 items-center">
                                        <AvatarDisplay url={currentUser?.avatar_url} sizeClass="w-10 h-10 shrink-0 shadow-sm" />
                                        <div className="flex-1 relative">
                                            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Viết bình luận..." className="w-full bg-stone-100 dark:bg-stone-700 dark:text-white border-2 border-transparent rounded-full py-3 pl-5 pr-12 outline-none focus:border-lime-200 dark:focus:border-lime-500/50 focus:bg-white text-[15px] transition-all" />
                                            <button type="submit" disabled={!newComment.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 text-lime-500 hover:text-lime-600 disabled:text-stone-300 dark:disabled:text-stone-600 p-1.5 rounded-full hover:bg-lime-50 dark:hover:bg-stone-600 transition"><Send size={20} /></button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    ))
                )}

                {loadingMore && <div className="flex justify-center py-6"><Loader2 className="animate-spin text-lime-500" size={36} /></div>}
                {!hasMore && posts.length > 0 && <div className="text-center py-8 text-stone-400 font-medium">Bạn đã xem hết bài viết! 🥝</div>}
            </div>

            {/* ========================================================= */}
            {/* MODAL TẠO BÀI VIẾT / CHIA SẺ                              */}
            {/* ========================================================= */}
            {isPostModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-stone-800 w-full max-w-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="relative border-b dark:border-stone-700 p-4 flex justify-center items-center bg-white dark:bg-stone-800">
                            <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                                {postMode === 'create' ? 'Tạo bài viết' : 'Chia sẻ bài viết'}
                            </h2>
                            <button onClick={closePostModal} className="absolute right-4 w-9 h-9 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 rounded-full flex justify-center items-center text-stone-600 dark:text-stone-300 transition"><X size={20} /></button>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="flex items-center gap-3 mb-4">
                                <AvatarDisplay url={currentUser?.avatar_url} sizeClass="w-10 h-10" />
                                <div>
                                    <h3 className="font-bold text-stone-900 dark:text-white text-[15px]">{currentUser?.full_name}</h3>
                                    <div className="flex items-center gap-1 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 px-2 py-0.5 rounded-md text-[11px] font-semibold mt-0.5 w-fit"><Globe size={12} /> Công khai</div>
                                </div>
                            </div>

                            <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder={postMode === 'create' ? `Bạn đang nghĩ gì thế?` : `Hãy nói gì đó về nội dung này...`} className="w-full text-lg outline-none resize-none bg-transparent text-stone-800 dark:text-stone-100 min-h-[120px]"></textarea>

                            {previews.length > 0 && (
                                <div className="mt-3 relative border border-stone-200 dark:border-stone-700 rounded-xl p-2 bg-stone-50 dark:bg-stone-900 overflow-hidden">
                                    <button type="button" onClick={() => {setPreviews([]); setSelectedFiles([])}} className="absolute top-4 right-4 z-10 w-8 h-8 bg-white dark:bg-stone-800 border dark:border-stone-700 rounded-full flex justify-center items-center hover:bg-stone-100 transition shadow-md"><X size={16} className="text-stone-600 dark:text-stone-300" /></button>
                                    <div className={`grid gap-1 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} max-h-[300px] overflow-y-auto rounded-lg custom-scrollbar`}>
                                        {previews.map((preview, index) => (
                                            selectedFiles[index].type.startsWith('video') ? <video key={index} src={preview} className="w-full h-40 object-cover bg-black" /> : <img key={index} src={preview} alt="preview" className="w-full h-40 object-cover border dark:border-stone-700" />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {postMode === 'share' && postToShare && (
                                <div className="mt-3 border border-stone-300 dark:border-stone-600 rounded-xl p-4 bg-white dark:bg-stone-800 pointer-events-none opacity-80">
                                    <div className="flex gap-2 items-center mb-2">
                                        <AvatarDisplay url={postToShare.author?.avatar_url} sizeClass="w-6 h-6" />
                                        <span className="font-bold text-sm dark:text-stone-200">{postToShare.author?.full_name}</span>
                                    </div>
                                    <p className="text-sm text-stone-700 dark:text-stone-300 line-clamp-3">{postToShare.content}</p>
                                    {postToShare.media && postToShare.media.length > 0 && <img src={postToShare.media[0].media_url} className="mt-2 h-20 w-full object-cover rounded-lg" alt="shared-preview" />}
                                </div>
                            )}
                        </div>

                        {postMode === 'create' && (
                            <div className="px-4 py-3">
                                <div className="flex items-center justify-between border border-stone-300 dark:border-stone-600 rounded-xl p-3 shadow-sm bg-white dark:bg-stone-800">
                                    <span className="font-semibold text-stone-600 dark:text-stone-300 text-[15px]">Thêm vào bài viết</span>
                                    <div className="flex gap-1">
                                        <div className="relative hover:bg-stone-100 dark:hover:bg-stone-700 p-2 rounded-full cursor-pointer transition">
                                            <ImageIcon size={24} className="text-lime-500" />
                                            <input type="file" multiple accept="image/*,video/*" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </div>
                                        <div className="hover:bg-stone-100 dark:hover:bg-stone-700 p-2 rounded-full cursor-pointer transition"><UserCircle size={24} className="text-blue-500" /></div>
                                        <div className="hover:bg-stone-100 dark:hover:bg-stone-700 p-2 rounded-full cursor-pointer transition"><Smile size={24} className="text-yellow-500" /></div>
                                        <div className="hover:bg-stone-100 dark:hover:bg-stone-700 p-2 rounded-full cursor-pointer transition"><MapPin size={24} className="text-rose-500" /></div>
                                        <div className="hover:bg-stone-100 dark:hover:bg-stone-700 p-2 rounded-full cursor-pointer transition"><MoreHorizontal size={24} className="text-stone-500" /></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-4 border-t dark:border-stone-700 bg-white dark:bg-stone-800">
                            <button onClick={handleSubmitModal} disabled={(!newPostContent.trim() && selectedFiles.length === 0 && postMode === 'create') || uploading} className="w-full bg-lime-500 dark:bg-lime-600 text-white py-2.5 rounded-lg font-bold hover:bg-lime-600 dark:hover:bg-lime-500 disabled:bg-stone-200 disabled:text-stone-400 dark:disabled:bg-stone-700 dark:disabled:text-stone-500 transition shadow-sm text-[15px]">
                                {uploading ? <div className="flex justify-center items-center gap-2"><Loader2 size={18} className="animate-spin"/> Đang xử lý...</div> : 'Đăng'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;