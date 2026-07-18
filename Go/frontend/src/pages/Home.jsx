import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../services/api/axiosClient';
import useAuthStore from '../store/useAuthStore';
import { Heart, MessageCircle, Share2, UserCircle, Send, Image as ImageIcon, X } from 'lucide-react';

const Home = () => {
    const { user } = useAuthStore();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- State cho Đăng Bài ---
    const [newPostContent, setNewPostContent] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]); // File thật để upload
    const [previews, setPreviews] = useState([]); // URL ảo để hiển thị preview
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // --- State cho Bình luận ---
    const [activeCommentPostId, setActiveCommentPostId] = useState(null);
    const [comments, setComments] = useState({});
    const [newComment, setNewComment] = useState('');

    const fetchPosts = async () => {
        try {
            const res = await axiosClient.get('/posts');
            setPosts(res.data.data || []);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    useEffect(() => { fetchPosts(); }, []);

    // Xử lý khi chọn file
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        setSelectedFiles(prev => [...prev, ...files]);
        
        // Tạo URL ảo để xem trước ảnh/video
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    // Nút X xóa file
    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    // ĐĂNG BÀI (Text + Media)
    const handleCreatePost = async (e) => {
        e.preventDefault();
        // Không có chữ cũng được, nhưng phải có ảnh. Nếu cả 2 trống thì chặn.
        if (!newPostContent.trim() && selectedFiles.length === 0) return;
        
        setUploading(true);
        try {
            let mediaUrls = [];
            
            // 1. Upload từng file lên Backend trước
            if (selectedFiles.length > 0) {
                for (let file of selectedFiles) {
                    const formData = new FormData();
                    formData.append('file', file);
                    const uploadRes = await axiosClient.post('/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' } // Bắt buộc cho việc gửi File
                    });
                    mediaUrls.push(uploadRes.data.data.url);
                }
            }

            // 2. Gửi Content và mảng Link ảnh để lưu bài viết
            await axiosClient.post('/posts', { 
                content: newPostContent,
                media_urls: mediaUrls 
            });
            
            // Reset lại form
            setNewPostContent('');
            setSelectedFiles([]);
            setPreviews([]);
            fetchPosts(); 
        } catch (error) {
            alert('Đăng bài thất bại');
        } finally {
            setUploading(false);
        }
    };

    // Tương tác (Giữ nguyên)
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
            const added = { ...res.data.data, author: { full_name: user.full_name } };
            setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), added] }));
            setNewComment('');
            setPosts(posts.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
        } catch (error) {}
    };

    return (
        <div className="max-w-2xl mx-auto mt-6 px-4 space-y-6">
            
            {/* KHU VỰC ĐĂNG BÀI MỚI */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex gap-3">
                    <UserCircle size={40} className="text-gray-400 shrink-0" />
                    <form onSubmit={handleCreatePost} className="flex-1">
                        <textarea 
                            value={newPostContent} 
                            onChange={(e) => setNewPostContent(e.target.value)} 
                            placeholder={`${user?.full_name} ơi, bạn đang nghĩ gì thế?`} 
                            className="w-full bg-gray-100 rounded-xl p-3 outline-none resize-none focus:ring-2 focus:ring-blue-100" 
                            rows="2"
                        ></textarea>
                        
                        {/* Khu vực hiển thị Ảnh/Video Preview */}
                        {previews.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3 p-2 bg-gray-50 rounded-lg border">
                                {previews.map((preview, index) => (
                                    <div key={index} className="relative w-24 h-24 group">
                                        {selectedFiles[index].type.startsWith('video') ? (
                                            <video src={preview} className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <img src={preview} alt="preview" className="w-full h-full object-cover rounded-lg shadow-sm" />
                                        )}
                                        {/* Nút xóa file */}
                                        <button type="button" onClick={() => removeFile(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between items-center mt-3 pt-3 border-t">
                            {/* Nút Gắn Ảnh / Video */}
                            <div>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg text-green-600 font-semibold transition">
                                    <ImageIcon size={20} /> Ảnh/Video
                                </button>
                                <input type="file" multiple accept="image/*,video/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                            </div>

                            <button type="submit" disabled={(!newPostContent.trim() && selectedFiles.length === 0) || uploading} className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition">
                                {uploading ? 'Đang tải lên...' : 'Đăng bài'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* BẢNG TIN (NEWS FEED) */}
            {loading ? <p className="text-center text-gray-500">Đang tải...</p> : posts.length === 0 ? <p className="text-center text-gray-500">Không có bài viết. Hãy tìm và follow ai đó để xem bài của họ!</p> : posts.map(post => (
                <div key={post.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex gap-3 mb-3">
                        <UserCircle size={40} className="text-gray-400" />
                        <div>
                            <h3 className="font-bold">{post.author.full_name}</h3>
                            <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString('vi-VN')}</p>
                        </div>
                    </div>
                    
                    {/* Phần Chữ */}
                    <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>

                    {/* HIỂN THỊ ẢNH/VIDEO CỦA BÀI VIẾT */}
                    {post.media && post.media.length > 0 && (
                        <div className={`grid gap-2 mt-3 ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {post.media.map(m => (
                                m.media_type === 'video' ? (
                                    <video key={m.id} controls className="w-full h-auto rounded-lg max-h-[500px] object-cover bg-black">
                                        <source src={m.media_url} />
                                    </video>
                                ) : (
                                    <img key={m.id} src={m.media_url} alt="Post media" className="w-full h-auto rounded-lg max-h-[500px] object-cover border" />
                                )
                            ))}
                        </div>
                    )}

                    {/* Các nút tương tác & Bình luận giữ nguyên... */}
                    <div className="flex justify-between items-center pt-4 mt-4 border-t text-sm text-gray-500">
                        <button onClick={() => handleToggleLike(post.id)} className={`flex-1 flex justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 transition ${post.is_liked ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                            <Heart size={20} className={post.is_liked ? 'fill-red-500 text-red-500' : ''} /> {post.likes_count}
                        </button>
                        <button onClick={() => handleToggleComments(post.id)} className="flex-1 flex justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 text-gray-600 transition">
                            <MessageCircle size={20} /> {post.comments_count}
                        </button>
                        <button className="flex-1 flex justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 text-gray-600 transition">
                            <Share2 size={20} /> Chia sẻ
                        </button>
                    </div>

                    {/* Khu vực sổ bình luận */}
                    {activeCommentPostId === post.id && (
                        <div className="mt-4 border-t pt-4">
                            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                                {(comments[post.id] || []).map(cmt => (
                                    <div key={cmt.id} className="flex gap-2">
                                        <UserCircle size={32} className="text-gray-400 shrink-0 mt-1" />
                                        <div className="bg-gray-100 px-4 py-2 rounded-2xl max-w-[85%]">
                                            <span className="font-semibold text-sm text-gray-900 block">{cmt.author.full_name}</span>
                                            <span className="text-gray-800 text-sm">{cmt.content}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
            ))}
        </div>
    );
};
export default Home;