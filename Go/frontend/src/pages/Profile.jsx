import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axiosClient from '../services/api/axiosClient';
import useAuthStore from '../store/useAuthStore';
import { UserCircle, UserPlus, UserCheck, Heart, MessageCircle, Share2, Send, Image as ImageIcon, X, Trash2, Edit3, Camera, Loader2 } from 'lucide-react';

const Profile = () => {
    const { id } = useParams();
    const { user: currentUser, updateUser } = useAuthStore();
    
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const isMyProfile = currentUser?.id === id;

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

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ full_name: '', bio: '', avatar_url: '' });
    const avatarInputRef = useRef(null);

    useEffect(() => {
        axiosClient.get(`/users/${id}`)
            .then(res => {
                setProfile(res.data.data);
                setEditData({ full_name: res.data.data.full_name, bio: res.data.data.bio || '', avatar_url: res.data.data.avatar_url || '' });
            })
            .catch(err => console.error(err));
    }, [id]);

    const fetchUserPosts = async (pageNum) => {
        if (pageNum === 1) setLoading(true); else setLoadingMore(true);
        try {
            const res = await axiosClient.get(`/users/${id}/posts?page=${pageNum}&limit=5`);
            const newPosts = res.data.data || [];
            if (pageNum === 1) setPosts(newPosts); else setPosts(prev => [...prev, ...newPosts]);
            setHasMore(newPosts.length === 5);
        } catch (error) {} finally { setLoading(false); setLoadingMore(false); }
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

    const handleToggleFollow = async () => {
        try {
            const res = await axiosClient.post(`/users/${id}/follow`);
            const isFollowing = res.data.data.is_following;
            setProfile(prev => ({ ...prev, is_following: isFollowing, followers_count: isFollowing ? prev.followers_count + 1 : prev.followers_count - 1 }));
        } catch (error) {}
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Xóa bài viết này?")) return;
        try {
            await axiosClient.delete(`/posts/${postId}`);
            setPosts(posts.filter(p => p.id !== postId)); 
        } catch (error) { alert("Lỗi xóa bài"); }
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
            const res = await axiosClient.post('/upload', formData); // Đã Fix Multipart
            setEditData({ ...editData, avatar_url: res.data.data.url });
        } catch (error) { alert("Lỗi upload ảnh"); }
    };

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
                const fd = new FormData(); fd.append('file', file);
                const res = await axiosClient.post('/upload', fd); // Bỏ headers đi
                mediaUrls.push(res.data.data.url);
            }
            await axiosClient.post('/posts', { content: newPostContent, media_urls: mediaUrls });
            setNewPostContent(''); setSelectedFiles([]); setPreviews([]); 
            setPage(1); fetchUserPosts(1);
        } catch (error) { alert("Lỗi tải bài");} finally { setUploading(false); }
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
            const added = { ...res.data.data, author: { full_name: currentUser.full_name, avatar_url: currentUser.avatar_url } };
            setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), added] }));
            setNewComment('');
            setPosts(posts.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
        } catch (error) {}
    };

    if (loading && posts.length === 0 && !profile) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
    if (!profile) return <div className="text-center pt-20 text-red-500">Người dùng không tồn tại!</div>;

    const AvatarDisplay = ({ url, sizeClass }) => (
        url ? <img src={url} alt="avatar" className={`${sizeClass} object-cover rounded-full border bg-white`} /> 
            : <UserCircle className={`${sizeClass} text-gray-300 bg-white rounded-full`} />
    );

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="bg-white shadow-sm rounded-b-xl overflow-hidden border border-gray-200 relative">
                <div className="h-48 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                <div className="px-8 pb-6 flex justify-between items-end relative -mt-16">
                    <div className="flex items-end gap-4">
                        <div className="bg-white p-1 rounded-full shadow-md relative group">
                            <AvatarDisplay url={profile.avatar_url} sizeClass="w-32 h-32" />
                            {isMyProfile && (
                                <div onClick={() => setIsEditing(true)} className="absolute top-1 left-1 w-32 h-32 bg-black/50 rounded-full flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Camera size={32} className="text-white mb-1" />
                                    <span className="text-white text-[10px] font-bold uppercase tracking-wider">Sửa hồ sơ</span>
                                </div>
                            )}
                        </div>
                        <div className="mb-2">
                            <h1 className="text-3xl font-bold text-gray-900">{profile.full_name}</h1>
                            <p className="text-gray-500 font-medium">@{profile.username}</p>
                            {profile.bio && <p className="text-gray-700 mt-1 max-w-md">{profile.bio}</p>}
                        </div>
                    </div>

                    {!isMyProfile && (
                        <button onClick={handleToggleFollow} className={`mb-4 flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition shadow-sm ${profile.is_following ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                            {profile.is_following ? <UserCheck size={20} /> : <UserPlus size={20} />} {profile.is_following ? 'Đang theo dõi' : 'Theo dõi'}
                        </button>
                    )}
                </div>
                
                <div className="px-8 py-4 border-t flex gap-8 text-gray-600 bg-gray-50">
                    <div><strong className="text-gray-900">{profile.followers_count}</strong> Người theo dõi</div>
                    <div><strong className="text-gray-900">{profile.following_count}</strong> Đang theo dõi</div>
                    <div><strong className="text-gray-900">{posts.length}</strong> Bài viết (trên màn hình)</div>
                </div>
            </div>

            {isEditing && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-2xl w-[400px] shadow-2xl relative">
                        <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={24} /></button>
                        <h2 className="text-xl font-bold mb-4">Chỉnh sửa thông tin</h2>
                        <div className="flex flex-col items-center gap-3 mb-6">
                            <div className="relative group">
                                <AvatarDisplay url={editData.avatar_url} sizeClass="w-24 h-24" />
                                <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/40 text-white flex justify-center items-center rounded-full opacity-0 group-hover:opacity-100 transition"><Camera size={24} /></button>
                                <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                            </div>
                            <button onClick={() => setEditData({...editData, avatar_url: ''})} className="text-sm text-red-500 hover:underline">Gỡ ảnh hiện tại</button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-gray-700">Họ và Tên</label>
                                <input type="text" value={editData.full_name} onChange={e => setEditData({...editData, full_name: e.target.value})} className="w-full border rounded-lg p-2 mt-1" />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700">Tiểu sử (Bio)</label>
                                <textarea value={editData.bio} onChange={e => setEditData({...editData, bio: e.target.value})} className="w-full border rounded-lg p-2 mt-1 resize-none h-20" placeholder="Viết gì đó về bạn..."></textarea>
                            </div>
                            <button onClick={handleSaveProfile} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700">Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-2xl mx-auto mt-6 space-y-6">
                {isMyProfile && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex gap-3">
                            <AvatarDisplay url={currentUser?.avatar_url} sizeClass="w-10 h-10 shrink-0" />
                            <form onSubmit={handleCreatePost} className="flex-1">
                                <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder="Bạn đang nghĩ gì thế?" className="w-full bg-gray-100 rounded-xl p-3 outline-none resize-none" rows="2"></textarea>
                                {previews.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3 p-2 bg-gray-50 rounded-lg border">
                                        {previews.map((preview, index) => (
                                            <div key={index} className="relative w-24 h-24 group">
                                                {selectedFiles[index].type.startsWith('video') ? <video src={preview} className="w-full h-full object-cover rounded-lg" /> : <img src={preview} alt="preview" className="w-full h-full object-cover rounded-lg shadow-sm" />}
                                                <button type="button" onClick={() => removeFile(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow"><X size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                                    <div>
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg text-green-600 font-semibold transition"><ImageIcon size={20} /> Ảnh/Video</button>
                                        <input type="file" multiple accept="image/*,video/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                                    </div>
                                    <button type="submit" disabled={(!newPostContent.trim() && selectedFiles.length === 0) || uploading} className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition">{uploading ? 'Đang tải...' : 'Đăng bài'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <h3 className="text-xl font-bold text-gray-800 mb-4 px-2">Bài viết của {profile.full_name}</h3>
                
                {posts.length === 0 ? (
                    <div className="bg-white p-8 text-center rounded-xl border text-gray-500">Chưa có bài viết nào.</div>
                ) : (
                    posts.map(post => (
                        <div key={post.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-3">
                                    <AvatarDisplay url={post.author.avatar_url} sizeClass="w-10 h-10" />
                                    <div>
                                        <h3 className="font-bold">{post.author.full_name}</h3>
                                        <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString('vi-VN')}</p>
                                    </div>
                                </div>
                                {isMyProfile && (
                                    <button onClick={() => handleDeletePost(post.id)} className="text-gray-400 hover:text-red-500 transition p-1" title="Xóa bài viết"><Trash2 size={20} /></button>
                                )}
                            </div>
                            
                            <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>

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
                                <button className="flex-1 flex justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 text-gray-600"><Share2 size={20} /> Chia sẻ</button>
                            </div>

                            {activeCommentPostId === post.id && (
                                <div className="mt-4 border-t pt-4">
                                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                                        {(comments[post.id] || []).map(cmt => (
                                            <div key={cmt.id} className="flex gap-2">
                                                <AvatarDisplay url={cmt.author.avatar_url} sizeClass="w-8 h-8 shrink-0 mt-1" />
                                                <div className="bg-gray-100 px-4 py-2 rounded-2xl max-w-[85%]">
                                                    <span className="font-semibold text-sm text-gray-900 block">{cmt.author.full_name}</span>
                                                    <span className="text-gray-800 text-sm">{cmt.content}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <form onSubmit={(e) => handleSendComment(e, post.id)} className="flex gap-2 items-center">
                                        <AvatarDisplay url={currentUser?.avatar_url} sizeClass="w-9 h-9 shrink-0" />
                                        <div className="flex-1 relative">
                                            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Viết bình luận..." className="w-full bg-gray-100 border-none rounded-full py-2 pl-4 pr-10 outline-none focus:ring-2 focus:ring-blue-200" />
                                            <button type="submit" disabled={!newComment.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500"><Send size={18} /></button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    ))
                )}

                {loadingMore && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-blue-500" size={32} /></div>}
                {!hasMore && posts.length > 0 && <div className="text-center py-6 text-gray-400">Đã xem hết bài viết!</div>}
            </div>
        </div>
    );
};

export default Profile;