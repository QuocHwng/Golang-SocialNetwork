import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../services/api/axiosClient';
import useAuthStore from '../store/useAuthStore';
import { Heart, MessageCircle, Share2, UserCircle, Send, Image as ImageIcon, X, Loader2, MoreHorizontal, Trash2, Edit3, Check } from 'lucide-react';

const Home = () => {
    const { user } = useAuthStore();
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

    useEffect(() => {
        const handleClickOutside = () => { setOpenPostMenuId(null); setOpenCommentMenuId(null); };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchPosts = async (pageNum = 1) => {
        if (pageNum === 1) setLoading(true); else setLoadingMore(true);
        try {
            const res = await axiosClient.get(`/posts?page=${pageNum}&limit=5`);
            const newPosts = res.data.data || [];
            if (pageNum === 1) setPosts(newPosts); else setPosts(prev => [...prev, ...newPosts]);
            setHasMore(newPosts.length === 5);
        } catch (error) { console.error(error); } finally { setLoading(false); setLoadingMore(false); }
    };

    useEffect(() => { fetchPosts(1); }, []);

    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) {
                if (hasMore && !loading && !loadingMore) setPage(prev => prev + 1);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasMore, loading, loadingMore]);

    useEffect(() => { if (page > 1) fetchPosts(page); }, [page]);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files]);
        setPreviews(prev => [...prev, ...files.map(file => URL.createObjectURL(file))]);
    };
    const removeFile = (i) => {
        setSelectedFiles(prev => prev.filter((_, index) => index !== i));
        setPreviews(prev => prev.filter((_, index) => index !== i));
    };

    // ĐÃ FIX LỖI UPLOAD CỦA BẠN TẠI ĐÂY
    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!newPostContent.trim() && selectedFiles.length === 0) return;
        setUploading(true);
        try {
            let mediaUrls = [];
            for (let file of selectedFiles) {
                const fd = new FormData(); 
                fd.append('file', file);
                // Bỏ headers multipart/form-data đi để trình duyệt tự lo boundary
                const res = await axiosClient.post('/upload', fd);
                mediaUrls.push(res.data.data.url);
            }
            await axiosClient.post('/posts', { content: newPostContent, media_urls: mediaUrls });
            setNewPostContent(''); setSelectedFiles([]); setPreviews([]);
            setPage(1); fetchPosts(1); 
        } catch (error) {
            alert('Đăng bài thất bại');
        } finally { setUploading(false); }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;
        try {
            await axiosClient.delete(`/posts/${postId}`);
            setPosts(posts.filter(p => p.id !== postId));
        } catch (error) { alert("Lỗi xóa bài"); }
    };

    const handleUpdatePost = async (postId) => {
        try {
            await axiosClient.put(`/posts/${postId}`, { content: editPostContent });
            setPosts(posts.map(p => p.id === postId ? { ...p, content: editPostContent } : p));
            setEditingPostId(null);
        } catch (error) { alert("Lỗi sửa bài"); }
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
        try {
            const res = await axiosClient.get(`/posts/${postId}/comments`);
            setComments(prev => ({ ...prev, [postId]: res.data.data || [] }));
        } catch (error) {}
    };

    const handleSendComment = async (e, postId) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            const res = await axiosClient.post(`/posts/${postId}/comments`, { content: newComment });
            const added = { ...res.data.data, author: { full_name: user.full_name, avatar_url: user.avatar_url } };
            setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), added] }));
            setNewComment('');
            setPosts(posts.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
        } catch (error) {}
    };

    const handleDeleteComment = async (commentId, postId) => {
        if (!window.confirm("Bạn muốn xóa bình luận này?")) return;
        try {
            await axiosClient.delete(`/comments/${commentId}`);
            setComments(prev => ({ ...prev, [postId]: prev[postId].filter(c => c.id !== commentId) }));
            setPosts(posts.map(p => p.id === postId ? { ...p, comments_count: p.comments_count - 1 } : p));
        } catch (error) { alert("Lỗi xóa bình luận"); }
    };

    const handleUpdateComment = async (commentId, postId) => {
        try {
            await axiosClient.put(`/comments/${commentId}`, { content: editCommentContent });
            setComments(prev => ({
                ...prev, 
                [postId]: prev[postId].map(c => c.id === commentId ? { ...c, content: editCommentContent } : c)
            }));
            setEditingCommentId(null);
        } catch (error) { alert("Lỗi sửa bình luận"); }
    };

    const AvatarDisplay = ({ url, sizeClass }) => (
        url ? <img src={url} alt="ava" className={`${sizeClass} object-cover rounded-full border bg-white`} /> 
            : <UserCircle className={`${sizeClass} text-gray-300 bg-white rounded-full`} />
    );

    return (
        <div className="max-w-2xl mx-auto mt-6 px-4 space-y-6 pb-10">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex gap-3">
                    <AvatarDisplay url={user?.avatar_url} sizeClass="w-10 h-10 shrink-0" />
                    <form onSubmit={handleCreatePost} className="flex-1">
                        <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder={`${user?.full_name} ơi, bạn đang nghĩ gì thế?`} className="w-full bg-gray-100 rounded-xl p-3 outline-none resize-none" rows="2"></textarea>
                        {previews.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3 p-2 bg-gray-50 rounded-lg border">
                                {previews.map((preview, index) => (
                                    <div key={index} className="relative w-20 h-20 group">
                                        <img src={preview} alt="preview" className="w-full h-full object-cover rounded-lg shadow-sm" />
                                        <button type="button" onClick={() => removeFile(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"><X size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-between items-center mt-3 pt-3 border-t">
                            <div>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg text-green-600 font-semibold transition"><ImageIcon size={20} /> Ảnh/Video</button>
                                <input type="file" multiple accept="image/*,video/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                            </div>
                            <button type="submit" disabled={(!newPostContent.trim() && selectedFiles.length === 0) || uploading} className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">{uploading ? 'Đang tải...' : 'Đăng bài'}</button>
                        </div>
                    </form>
                </div>
            </div>

            {loading ? <div className="flex justify-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div> : posts.length === 0 ? <p className="text-center text-gray-500">Trống. Hãy follow ai đó nhé!</p> : posts.map(post => (
                <div key={post.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-3">
                            <AvatarDisplay url={post.author.avatar_url} sizeClass="w-10 h-10" />
                            <div>
                                <h3 className="font-bold">{post.author.full_name}</h3>
                                <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString('vi-VN')}</p>
                            </div>
                        </div>
                        {user?.id === post.author.id && (
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setOpenPostMenuId(openPostMenuId === post.id ? null : post.id); }} className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"><MoreHorizontal size={20} /></button>
                                {openPostMenuId === post.id && (
                                    <div className="absolute right-0 mt-1 w-36 bg-white border rounded-xl shadow-lg overflow-hidden z-10" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => { setEditingPostId(post.id); setEditPostContent(post.content); setOpenPostMenuId(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><Edit3 size={16} /> Chỉnh sửa</button>
                                        <button onClick={() => { handleDeletePost(post.id); setOpenPostMenuId(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={16} /> Xóa bài</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {editingPostId === post.id ? (
                        <div className="mt-2 mb-3">
                            <textarea value={editPostContent} onChange={(e) => setEditPostContent(e.target.value)} className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows="3" autoFocus />
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setEditingPostId(null)} className="px-4 py-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm font-semibold">Hủy</button>
                                <button onClick={() => handleUpdatePost(post.id)} disabled={!editPostContent.trim()} className="px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold flex items-center gap-1"><Check size={16} /> Lưu</button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                    )}

                    {post.media && post.media.length > 0 && (
                        <div className={`grid gap-2 mt-3 ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {post.media.map(m => ( m.media_type === 'video' ? <video key={m.id} controls className="w-full rounded-lg max-h-[500px] object-cover bg-black"><source src={m.media_url} /></video> : <img key={m.id} src={m.media_url} alt="media" className="w-full rounded-lg max-h-[500px] object-cover border" /> ))}
                        </div>
                    )}

                    <div className="flex justify-between items-center text-gray-500 text-sm mt-4 border-b pb-2">
                        <span>{post.likes_count} lượt thích</span>
                        <span className="cursor-pointer hover:underline" onClick={() => handleToggleComments(post.id)}>{post.comments_count} bình luận</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <button onClick={() => handleToggleLike(post.id)} className={`flex-1 flex justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 transition ${post.is_liked ? 'text-red-500 font-medium' : 'text-gray-600'}`}><Heart size={20} className={post.is_liked ? 'fill-red-500' : ''} /> Thích</button>
                        <button onClick={() => handleToggleComments(post.id)} className="flex-1 flex justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 text-gray-600"><MessageCircle size={20} /> Bình luận</button>
                    </div>

                    {activeCommentPostId === post.id && (
                        <div className="mt-4 border-t pt-4">
                            <div className="space-y-4 mb-4 max-h-80 overflow-y-auto pr-2">
                                {(comments[post.id] || []).map(cmt => (
                                    <div key={cmt.id} className="flex gap-2 group">
                                        <AvatarDisplay url={cmt.author.avatar_url} sizeClass="w-8 h-8 shrink-0 mt-1" />
                                        <div className="flex-1">
                                            {editingCommentId === cmt.id ? (
                                                <div className="bg-gray-100 p-2 rounded-2xl">
                                                    <input type="text" value={editCommentContent} onChange={(e) => setEditCommentContent(e.target.value)} className="w-full bg-transparent border-b border-gray-300 outline-none px-2 py-1 mb-2 text-sm" autoFocus />
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setEditingCommentId(null)} className="text-xs font-semibold text-gray-500 hover:text-gray-700">Hủy</button>
                                                        <button onClick={() => handleUpdateComment(cmt.id, post.id)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Lưu</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-gray-100 px-4 py-2 rounded-2xl inline-block max-w-[85%]">
                                                        <span className="font-semibold text-sm text-gray-900 block">{cmt.author.full_name}</span>
                                                        <span className="text-gray-800 text-sm">{cmt.content}</span>
                                                    </div>
                                                    {user?.id === cmt.author.id && (
                                                        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={(e) => { e.stopPropagation(); setOpenCommentMenuId(openCommentMenuId === cmt.id ? null : cmt.id); }} className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-200"><MoreHorizontal size={16} /></button>
                                                            {openCommentMenuId === cmt.id && (
                                                                <div className="absolute left-0 mt-1 w-28 bg-white border rounded-lg shadow-lg overflow-hidden z-10" onClick={(e) => e.stopPropagation()}>
                                                                    <button onClick={() => { setEditingCommentId(cmt.id); setEditCommentContent(cmt.content); setOpenCommentMenuId(null); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">Chỉnh sửa</button>
                                                                    <button onClick={() => { handleDeleteComment(cmt.id, post.id); setOpenCommentMenuId(null); }} className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Xóa</button>
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
                            <form onSubmit={(e) => handleSendComment(e, post.id)} className="flex gap-2 items-center">
                                <AvatarDisplay url={user?.avatar_url} sizeClass="w-9 h-9 shrink-0" />
                                <div className="flex-1 relative">
                                    <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Viết bình luận..." className="w-full bg-gray-100 border-none rounded-full py-2 pl-4 pr-10 outline-none focus:ring-2 focus:ring-blue-200" />
                                    <button type="submit" disabled={!newComment.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700 disabled:text-gray-300"><Send size={18} /></button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            ))}

            {loadingMore && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-blue-500" size={32} /></div>}
            {!hasMore && posts.length > 0 && <div className="text-center py-6 text-gray-400">Bạn đã xem hết bài viết!</div>}
        </div>
    );
};
export default Home;