import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosClient from '../services/api/axiosClient';
import useAuthStore from '../store/useAuthStore';
import { Heart, MessageCircle, Share2, UserCircle, Send, Image as ImageIcon, X, Loader2 } from 'lucide-react';

const Home = () => {
    const { user } = useAuthStore();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- STATE CHO INFINITE SCROLL ---
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

    // Hàm gọi API lấy bài viết (Có phân trang)
    const fetchPosts = async (pageNum = 1) => {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const res = await axiosClient.get(`/posts?page=${pageNum}&limit=5`); // Lấy 5 bài mỗi lần cuộn cho dễ test
            const newPosts = res.data.data || [];

            if (pageNum === 1) {
                setPosts(newPosts);
            } else {
                setPosts(prev => [...prev, ...newPosts]); // Nối bài viết cũ và mới
            }

            // Nếu trả về ít hơn 5 bài nghĩa là đã hết dữ liệu trong DB
            setHasMore(newPosts.length === 5);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Lần đầu vào trang -> Gọi page 1
    useEffect(() => {
        fetchPosts(1);
    }, []);

    // Hiệu ứng bắt sự kiện Cuộn chuột (Scroll)
    useEffect(() => {
        const handleScroll = () => {
            // Nếu người dùng cuộn cách đáy màn hình 100px -> Kích hoạt load thêm
            if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) {
                if (hasMore && !loading && !loadingMore) {
                    setPage(prevPage => prevPage + 1);
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasMore, loading, loadingMore]);

    // Khi biến `page` thay đổi (và lớn hơn 1) -> Gọi API lấy trang tiếp theo
    useEffect(() => {
        if (page > 1) {
            fetchPosts(page);
        }
    }, [page]);

    // --- CÁC HÀM XỬ LÝ KHÁC (Đăng bài, Like, Comment giữ nguyên) ---
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files]);
        setPreviews(prev => [...prev, ...files.map(file => URL.createObjectURL(file))]);
    };
    const removeFile = (i) => {
        setSelectedFiles(prev => prev.filter((_, index) => index !== i));
        setPreviews(prev => prev.filter((_, index) => index !== i));
    };

    const handleCreatePost = async (e) => {
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
            await axiosClient.post('/posts', { content: newPostContent, media_urls: mediaUrls });
            
            // Xóa rác, reset về trang 1
            setNewPostContent(''); setSelectedFiles([]); setPreviews([]);
            setPage(1);
            fetchPosts(1); 
        } catch (error) {} finally { setUploading(false); }
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

    const AvatarDisplay = ({ url, sizeClass }) => (
        url ? <img src={url} alt="ava" className={`${sizeClass} object-cover rounded-full border bg-white`} /> 
            : <UserCircle className={`${sizeClass} text-gray-300 bg-white rounded-full`} />
    );

    return (
        <div className="max-w-2xl mx-auto mt-6 px-4 space-y-6 pb-10">
            {/* Đăng bài */}
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

            {/* BẢNG TIN */}
            {loading ? <div className="flex justify-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div> : posts.length === 0 ? <p className="text-center text-gray-500">Trống. Hãy follow ai đó nhé!</p> : posts.map(post => (
                <div key={post.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex gap-3 mb-3">
                        <AvatarDisplay url={post.author.avatar_url} sizeClass="w-10 h-10" />
                        <div>
                            <h3 className="font-bold">{post.author.full_name}</h3>
                            <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString('vi-VN')}</p>
                        </div>
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
                                <AvatarDisplay url={user?.avatar_url} sizeClass="w-9 h-9 shrink-0" />
                                <div className="flex-1 relative">
                                    <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Viết bình luận..." className="w-full bg-gray-100 border-none rounded-full py-2 pl-4 pr-10 outline-none focus:ring-2 focus:ring-blue-200" />
                                    <button type="submit" disabled={!newComment.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500"><Send size={18} /></button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            ))}

            {/* HIỂN THỊ SPINNER KHI ĐANG CUỘN LOAD THÊM */}
            {loadingMore && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-blue-500" size={32} /></div>}
            
            {/* THÔNG BÁO HẾT BÀI */}
            {!hasMore && posts.length > 0 && (
                <div className="text-center py-6 text-gray-400">Bạn đã xem hết bài viết!</div>
            )}
        </div>
    );
};
export default Home;