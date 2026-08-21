import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../services/api/axiosClient';
import useAuthStore from '../store/useAuthStore';
import { UserCircle, UserPlus, UserCheck, Heart, MessageCircle, Share2, Send, Image as ImageIcon, X, Trash2, Edit3, Loader2, MoreHorizontal, Check, Users, ArrowLeft, Clock, ShieldCheck, UserMinus } from 'lucide-react';

const GroupDetail = () => {
    const { id } = useParams();
    const { user: currentUser } = useAuthStore();
    const navigate = useNavigate();

    const [group, setGroup] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const [newPostContent, setNewPostContent] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const [activeCommentPostId, setActiveCommentPostId] = useState(null);
    const [comments, setComments] = useState({});
    const [newComment, setNewComment] = useState('');

    const [openPostMenuId, setOpenPostMenuId] = useState(null);
    const [editingPostId, setEditingPostId] = useState(null);
    const [editPostContent, setEditPostContent] = useState('');
    const [openCommentMenuId, setOpenCommentMenuId] = useState(null);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editCommentContent, setEditCommentContent] = useState('');

    const [requests, setRequests] = useState([]);
    const [showAdminModal, setShowAdminModal] = useState(false);

    // --- STATE CHO DANH SÁCH THÀNH VIÊN ---
    const [members, setMembers] = useState([]);
    const [showMembersModal, setShowMembersModal] = useState(false);

    const isAdmin = group?.creator_id === currentUser?.id;
    const isApprovedMember = group?.join_status === 'approved';
    const isPending = group?.join_status === 'pending';

    useEffect(() => {
        const handleClickOutside = () => { setOpenPostMenuId(null); setOpenCommentMenuId(null); };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        axiosClient.get(`/groups/${id}`).then(res => setGroup(res.data.data)).catch(() => navigate('/groups'));
    }, [id]);

    const fetchGroupPosts = async (pageNum) => {
        if (pageNum === 1) setLoading(true); else setLoadingMore(true);
        try {
            const res = await axiosClient.get(`/groups/${id}/posts?page=${pageNum}&limit=5`);
            const newPosts = res.data.data || [];
            if (pageNum === 1) setPosts(newPosts); else setPosts(prev => [...prev, ...newPosts]);
            setHasMore(newPosts.length === 5);
        } catch (error) {} finally { setLoading(false); setLoadingMore(false); }
    };

    useEffect(() => {
        if (group && (isAdmin || isApprovedMember)) { setPage(1); fetchGroupPosts(1); } 
        else { setLoading(false); }
    }, [group, isAdmin, isApprovedMember]);

    useEffect(() => {
        if (group && isAdmin) axiosClient.get(`/groups/${id}/requests`).then(res => setRequests(res.data.data || []));
    }, [group, isAdmin, id]);

    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) {
                if (hasMore && !loading && !loadingMore && (isAdmin || isApprovedMember)) setPage(prev => prev + 1);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasMore, loading, loadingMore, isAdmin, isApprovedMember]);

    useEffect(() => { if (page > 1) fetchGroupPosts(page); }, [page]);

    const handleToggleJoin = async () => {
        if (isApprovedMember) { if (!window.confirm("Bạn có chắc chắn muốn rời nhóm này?")) return; } 
        else if (isPending) { if (!window.confirm("Hủy yêu cầu tham gia nhóm?")) return; }

        try {
            const res = await axiosClient.post(`/groups/${id}/join`);
            const newStatus = res.data.data.join_status; 
            setGroup(prev => {
                let newCount = prev.members_count;
                if (prev.join_status === 'approved' && newStatus === 'none') newCount -= 1;
                return { ...prev, join_status: newStatus, members_count: newCount };
            });
            if (newStatus === 'none') setPosts([]);
        } catch (error) {}
    };

    const handleApproveReject = async (targetUserId, action) => {
        try {
            await axiosClient.post(`/groups/${id}/requests/${targetUserId}?action=${action}`);
            setRequests(prev => prev.filter(r => r.user_id !== targetUserId));
            if (action === 'approve') setGroup(prev => ({ ...prev, members_count: prev.members_count + 1 }));
        } catch (error) { alert("Lỗi xử lý yêu cầu"); }
    };

    // --- HÀM XEM DANH SÁCH & KICK THÀNH VIÊN ---
    const handleOpenMembersModal = async () => {
        if (!isAdmin && !isApprovedMember) return;
        try {
            const res = await axiosClient.get(`/groups/${id}/members`);
            setMembers(res.data.data || []);
            setShowMembersModal(true);
        } catch (error) { alert("Không thể tải danh sách thành viên"); }
    };

    const handleKickMember = async (targetUserId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa người này khỏi nhóm? Họ sẽ phải xin lại từ đầu!")) return;
        try {
            await axiosClient.delete(`/groups/${id}/members/${targetUserId}`);
            setMembers(prev => prev.filter(m => m.user_id !== targetUserId));
            setGroup(prev => ({ ...prev, members_count: prev.members_count - 1 }));
        } catch (error) { alert(error.response?.data?.message || "Lỗi xóa thành viên"); }
    };

    // --- CÁC HÀM XỬ LÝ POST/COMMENT ---
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files]);
        setPreviews(prev => [...prev, ...files.map(file => URL.createObjectURL(file))]);
    };
    const removeFile = (i) => {
        setSelectedFiles(prev => prev.filter((_, index) => index !== i));
        setPreviews(prev => prev.filter((_, index) => index !== i));
    };

    const handleCreateGroupPost = async (e) => {
        e.preventDefault();
        if (!newPostContent.trim() && selectedFiles.length === 0) return;
        setUploading(true);
        try {
            let mediaUrls = [];
            for (let file of selectedFiles) {
                const fd = new FormData(); fd.append('file', file);
                const res = await axiosClient.post('/upload', fd); 
                mediaUrls.push(res.data.data.url);
            }
            await axiosClient.post('/posts', { content: newPostContent, media_urls: mediaUrls, group_id: id });
            setNewPostContent(''); setSelectedFiles([]); setPreviews([]); setPage(1); fetchGroupPosts(1);
        } catch (error) { alert("Lỗi đăng bài"); } finally { setUploading(false); }
    };

    const handleDeletePost = async (postId) => { if (!window.confirm("Xóa bài viết này?")) return; try { await axiosClient.delete(`/posts/${postId}`); setPosts(posts.filter(p => p.id !== postId)); } catch (error) {} };
    const handleUpdatePost = async (postId) => { try { await axiosClient.put(`/posts/${postId}`, { content: editPostContent }); setPosts(posts.map(p => p.id === postId ? { ...p, content: editPostContent } : p)); setEditingPostId(null); } catch (error) {} };
    const handleToggleLike = async (postId) => { try { const res = await axiosClient.post(`/posts/${postId}/like`); const isLiked = res.data.data.is_liked; setPosts(posts.map(p => p.id === postId ? { ...p, is_liked: isLiked, likes_count: isLiked ? p.likes_count + 1 : p.likes_count - 1 } : p)); } catch (error) {} };
    const handleToggleComments = async (postId) => { if (activeCommentPostId === postId) { setActiveCommentPostId(null); return; } setActiveCommentPostId(postId); try { const res = await axiosClient.get(`/posts/${postId}/comments`); setComments(prev => ({ ...prev, [postId]: res.data.data || [] })); } catch (error) {} };
    const handleSendComment = async (e, postId) => { e.preventDefault(); if (!newComment.trim()) return; try { const res = await axiosClient.post(`/posts/${postId}/comments`, { content: newComment }); const added = { ...res.data.data, author: { id: currentUser.id, full_name: currentUser.full_name, avatar_url: currentUser.avatar_url } }; setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), added] })); setNewComment(''); setPosts(posts.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p)); } catch (error) {} };
    const handleDeleteComment = async (commentId, postId) => { if (!window.confirm("Xóa bình luận này?")) return; try { await axiosClient.delete(`/comments/${commentId}`); setComments(prev => ({ ...prev, [postId]: prev[postId].filter(c => c.id !== commentId) })); setPosts(posts.map(p => p.id === postId ? { ...p, comments_count: p.comments_count - 1 } : p)); } catch (error) {} };
    const handleUpdateComment = async (commentId, postId) => { try { await axiosClient.put(`/comments/${commentId}`, { content: editCommentContent }); setComments(prev => ({ ...prev, [postId]: prev[postId].map(c => c.id === commentId ? { ...c, content: editCommentContent } : c) })); setEditingCommentId(null); } catch (error) {} };

    const AvatarDisplay = ({ url, sizeClass }) => (
        url ? <img src={url} alt="ava" className={`${sizeClass} object-cover rounded-full border border-stone-200 dark:border-stone-700 bg-white shrink-0`} /> 
            : <UserCircle className={`${sizeClass} text-stone-300 bg-white rounded-full shrink-0`} />
    );

    if (!group) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-lime-500" size={32} /></div>;

    return (
        <div className="max-w-4xl mx-auto pb-10 px-4 sm:px-0 mt-4">
            <button onClick={() => navigate('/groups')} className="flex items-center gap-2 text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 font-semibold mb-4 transition">
                <ArrowLeft size={20} /> Quay lại danh sách nhóm
            </button>

            {/* HEADER NHÓM */}
            <div className="bg-white dark:bg-stone-800 shadow-sm rounded-3xl overflow-hidden border border-stone-100 dark:border-stone-700 mb-6 transition-colors relative">
                <div className="h-64 bg-stone-200 dark:bg-stone-700 relative">
                    {group.cover_url ? <img src={group.cover_url} alt="cover" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-r from-lime-400 to-emerald-600"></div>}
                </div>
                <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl font-black text-stone-900 dark:text-white mb-2">{group.name}</h1>
                        
                        {/* NÚT BẤM XEM DANH SÁCH THÀNH VIÊN */}
                        <div 
                            onClick={handleOpenMembersModal}
                            className={`flex items-center justify-center md:justify-start gap-2 mb-2 font-medium w-fit mx-auto md:mx-0 ${
                                (isAdmin || isApprovedMember) ? 'cursor-pointer hover:underline text-lime-600 dark:text-lime-400' : 'text-stone-500 dark:text-stone-400 cursor-default'
                            }`}
                        >
                            <Users size={18} /> {group.members_count} thành viên
                        </div>
                        
                        {group.description && <p className="text-stone-700 dark:text-stone-300 text-sm max-w-xl">{group.description}</p>}
                    </div>

                    {isAdmin ? (
                        <button onClick={() => setShowAdminModal(true)} className="relative px-6 py-3 rounded-2xl font-bold transition shadow-sm bg-lime-100 hover:bg-lime-200 text-lime-700 flex items-center gap-2">
                            <ShieldCheck size={20} /> Quản lý nhóm
                            {requests.length > 0 && <span className="absolute -top-2 -right-2 bg-rose-500 text-white w-6 h-6 rounded-full flex justify-center items-center text-xs shadow-md">{requests.length}</span>}
                        </button>
                    ) : (
                        <button onClick={handleToggleJoin} className={`px-8 py-3 rounded-2xl font-bold transition shadow-sm flex items-center gap-2 ${
                            isApprovedMember ? 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-300' :
                            isPending ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-200' :
                            'bg-lime-500 text-white hover:bg-lime-600 shadow-[0_4px_14px_rgba(132,204,22,0.39)]'
                        }`}>
                            {isApprovedMember ? <UserCheck size={20} /> : isPending ? <Clock size={20} /> : <UserPlus size={20} />}
                            {isApprovedMember ? 'Đã tham gia' : isPending ? 'Đang chờ duyệt' : 'Tham gia nhóm'}
                        </button>
                    )}
                </div>
            </div>

            {/* MODAL DANH SÁCH THÀNH VIÊN VÀ KICK */}
            {showMembersModal && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl w-full max-w-md shadow-2xl relative border dark:border-stone-700">
                        <button onClick={() => setShowMembersModal(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 dark:text-stone-500 dark:hover:text-white"><X size={24} /></button>
                        <h2 className="text-xl font-black mb-6 text-stone-900 dark:text-white flex items-center gap-2"><Users className="text-lime-500" /> Danh sách thành viên</h2>
                        
                        <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                            {members.map(member => (
                                <div key={member.user_id} className="flex justify-between items-center bg-stone-50 dark:bg-stone-700/50 p-3 rounded-2xl border border-stone-100 dark:border-stone-600 group">
                                    <div className="flex items-center gap-3">
                                        <AvatarDisplay url={member.avatar_url} sizeClass="w-10 h-10" />
                                        <div>
                                            <span className="font-bold text-stone-900 dark:text-white text-[15px]">{member.full_name}</span>
                                            {member.role === 'admin' && <div className="text-[10px] bg-lime-500 text-white px-2 py-0.5 rounded-full font-bold uppercase w-fit mt-0.5">Admin</div>}
                                        </div>
                                    </div>
                                    
                                    {/* Nút Kick (Chỉ hiện nếu mình là Admin VÀ người kia không phải là chính mình) */}
                                    {isAdmin && member.user_id !== currentUser.id && (
                                        <button 
                                            onClick={() => handleKickMember(member.user_id)} 
                                            className="px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-600 text-stone-600 dark:text-stone-300 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/40 dark:hover:text-rose-400 font-semibold text-xs flex items-center gap-1 transition opacity-0 group-hover:opacity-100"
                                            title="Đuổi khỏi nhóm"
                                        >
                                            <UserMinus size={14} /> Xóa
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ADMIN DUYỆT THÀNH VIÊN */}
            {showAdminModal && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl w-full max-w-md shadow-2xl relative border dark:border-stone-700">
                        <button onClick={() => setShowAdminModal(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 dark:text-stone-500 dark:hover:text-white"><X size={24} /></button>
                        <h2 className="text-xl font-black mb-6 text-stone-900 dark:text-white flex items-center gap-2"><ShieldCheck className="text-lime-500" /> Yêu cầu tham gia</h2>
                        
                        <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                            {requests.length === 0 ? (
                                <p className="text-center text-stone-500 py-6">Không có yêu cầu nào mới.</p>
                            ) : (
                                requests.map(req => (
                                    <div key={req.user_id} className="flex justify-between items-center bg-stone-50 dark:bg-stone-700/50 p-3 rounded-2xl border border-stone-100 dark:border-stone-600">
                                        <div className="flex items-center gap-3">
                                            <AvatarDisplay url={req.avatar_url} sizeClass="w-10 h-10" />
                                            <span className="font-bold text-stone-900 dark:text-white text-sm">{req.full_name}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApproveReject(req.user_id, 'approve')} className="w-8 h-8 rounded-full bg-lime-100 text-lime-600 hover:bg-lime-500 hover:text-white flex justify-center items-center transition"><Check size={16}/></button>
                                            <button onClick={() => handleApproveReject(req.user_id, 'reject')} className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white flex justify-center items-center transition"><X size={16}/></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-2xl mx-auto space-y-6">
                {isAdmin || isApprovedMember ? (
                    <>
                        <div className="bg-white dark:bg-stone-800 p-5 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-stone-100 dark:border-stone-700 transition-colors">
                            <div className="flex gap-4">
                                <AvatarDisplay url={currentUser?.avatar_url} sizeClass="w-12 h-12" />
                                <form onSubmit={handleCreateGroupPost} className="flex-1">
                                    <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder="Viết gì đó vào nhóm..." className="w-full bg-stone-50 dark:bg-stone-700 dark:text-white rounded-2xl p-4 outline-none resize-none focus:ring-2 focus:ring-lime-500/50 text-[16px]" rows="2"></textarea>
                                    {previews.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-4 p-3 bg-stone-50 dark:bg-stone-900 rounded-2xl border dark:border-stone-700">
                                            {previews.map((preview, index) => (
                                                <div key={index} className="relative w-24 h-24 group">
                                                    {selectedFiles[index].type.startsWith('video') ? <video src={preview} className="w-full h-full object-cover rounded-xl" /> : <img src={preview} alt="preview" className="w-full h-full object-cover rounded-xl shadow-sm" />}
                                                    <button type="button" onClick={() => removeFile(index)} className="absolute -top-2 -right-2 bg-stone-800 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100"><X size={14} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center mt-4">
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 hover:bg-lime-50 dark:hover:bg-stone-700 rounded-xl text-lime-600 dark:text-lime-400 font-bold transition-colors"><ImageIcon size={22} /> Ảnh/Video</button>
                                        <input type="file" multiple accept="image/*,video/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                                        <button type="submit" disabled={(!newPostContent.trim() && selectedFiles.length === 0) || uploading} className="bg-lime-500 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-lime-600 disabled:opacity-50 shadow-[0_4px_14px_rgba(132,204,22,0.39)]">Đăng vào nhóm</button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {loading && posts.length === 0 ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-lime-500" size={40} /></div> : posts.length === 0 ? <p className="text-center text-stone-500 dark:text-stone-400 py-10">Nhóm chưa có bài viết nào.</p> : posts.map(post => (
                            <div key={post.id} className="bg-white dark:bg-stone-800 p-5 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-stone-100 dark:border-stone-700 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-3 items-center">
                                        <AvatarDisplay url={post.author?.avatar_url} sizeClass="w-12 h-12 shadow-sm" />
                                        <div>
                                            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-[16px]">{post.author?.full_name}</h3>
                                            <p className="text-xs text-stone-500 dark:text-stone-400">{new Date(post.created_at).toLocaleString('vi-VN')}</p>
                                        </div>
                                    </div>
                                    {(currentUser?.id === post.author?.id || isAdmin) && (
                                        <div className="relative">
                                            <button onClick={(e) => { e.stopPropagation(); setOpenPostMenuId(openPostMenuId === post.id ? null : post.id); }} className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"><MoreHorizontal size={20} /></button>
                                            {openPostMenuId === post.id && (
                                                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-2xl shadow-xl overflow-hidden z-10 p-2" onClick={(e) => e.stopPropagation()}>
                                                    {currentUser?.id === post.author?.id && <button onClick={() => { setEditingPostId(post.id); setEditPostContent(post.content); setOpenPostMenuId(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-xl transition"><Edit3 size={16} /> Chỉnh sửa</button>}
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
                                        {post.media.map(m => ( m.media_type === 'video' ? <video key={m.id} controls className="w-full rounded-2xl max-h-[500px] object-cover bg-black"><source src={m.media_url} /></video> : <img key={m.id} src={m.media_url} alt="media" className="w-full rounded-2xl max-h-[500px] object-cover border dark:border-stone-700" /> ))}
                                    </div>
                                )}

                                <div className="flex justify-between items-center text-stone-500 dark:text-stone-400 text-[15px] pb-3 border-b dark:border-stone-700">
                                    <span className="flex items-center gap-1.5"><Heart size={16} className="fill-lime-500 text-lime-500" /> {post.likes_count}</span>
                                    <span className="cursor-pointer hover:underline" onClick={() => handleToggleComments(post.id)}>{post.comments_count} bình luận</span>
                                </div>

                                {group.is_member && (
                                    <div className="flex justify-between items-center pt-3 gap-2">
                                        <button onClick={() => handleToggleLike(post.id)} className={`flex-1 flex justify-center gap-2 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 font-semibold ${post.is_liked ? 'text-lime-600' : 'text-stone-600 dark:text-stone-400'}`}>
                                            <Heart size={20} className={post.is_liked ? 'fill-current' : ''} /> Thích
                                        </button>
                                        <button onClick={() => handleToggleComments(post.id)} className="flex-1 flex justify-center gap-2 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 font-semibold">
                                            <MessageCircle size={20} /> Bình luận
                                        </button>
                                    </div>
                                )}

                                {activeCommentPostId === post.id && (
                                    <div className="mt-4 pt-4 border-t dark:border-stone-700">
                                        <div className="space-y-4 mb-5 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                            {(comments[post.id] || []).map(cmt => (
                                                <div key={cmt.id} className="flex gap-3">
                                                    <AvatarDisplay url={cmt.author?.avatar_url} sizeClass="w-9 h-9 shrink-0 mt-1" />
                                                    <div className="bg-stone-100 dark:bg-stone-700 px-4 py-2.5 rounded-2xl inline-block max-w-[85%]">
                                                        <span className="font-bold text-[14px] text-stone-900 dark:text-stone-100 block mb-0.5">{cmt.author?.full_name}</span>
                                                        <span className="text-stone-800 dark:text-stone-200">{cmt.content}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {group.is_member && (
                                            <form onSubmit={(e) => handleSendComment(e, post.id)} className="flex gap-3 items-center">
                                                <AvatarDisplay url={currentUser?.avatar_url} sizeClass="w-10 h-10 shrink-0" />
                                                <div className="flex-1 relative">
                                                    <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Viết bình luận..." className="w-full bg-stone-100 dark:bg-stone-700 dark:text-white border-none rounded-full py-3 pl-5 pr-12 outline-none focus:ring-2 focus:ring-lime-500/50" />
                                                    <button type="submit" disabled={!newComment.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 text-lime-500 hover:text-lime-600 disabled:text-stone-400 p-1.5"><Send size={20} /></button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {loadingMore && <div className="flex justify-center py-6"><Loader2 className="animate-spin text-lime-500" size={36} /></div>}
                    </>
                ) : (
                    <div className="bg-stone-100 dark:bg-stone-800 p-6 text-center rounded-3xl border border-stone-200 dark:border-stone-700">
                        <ShieldCheck size={64} className="mx-auto text-stone-300 dark:text-stone-600 mb-4" />
                        <h2 className="text-xl font-bold text-stone-800 dark:text-stone-200 mb-2">Nhóm riêng tư</h2>
                        <p className="text-stone-500 dark:text-stone-400 font-medium">Bạn phải được Admin duyệt mới có thể xem và đăng bài.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupDetail;