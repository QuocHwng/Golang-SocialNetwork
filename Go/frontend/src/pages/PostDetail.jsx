import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../services/api/axiosClient';
import useAuthStore from '../store/useAuthStore';
import { Heart, UserCircle, Send, ArrowLeft } from 'lucide-react';

const PostDetail = () => {
    const { id } = useParams(); // Lấy ID bài viết từ trên thanh URL
    const navigate = useNavigate();
    const { user } = useAuthStore();
    
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPostDetail = async () => {
            try {
                // Tải song song cả Bài viết và Bình luận
                const [postRes, commentRes] = await Promise.all([
                    axiosClient.get(`/posts/${id}`),
                    axiosClient.get(`/posts/${id}/comments`)
                ]);
                setPost(postRes.data.data);
                setComments(commentRes.data.data || []);
            } catch (error) {
                alert("Bài viết không tồn tại!");
                navigate('/');
            } finally {
                setLoading(false);
            }
        };
        fetchPostDetail();
    }, [id]);

    const handleToggleLike = async () => {
        try {
            const res = await axiosClient.post(`/posts/${id}/like`);
            const isLiked = res.data.data.is_liked;
            setPost({ ...post, is_liked: isLiked, likes_count: isLiked ? post.likes_count + 1 : post.likes_count - 1 });
        } catch (error) { console.error(error); }
    };

    const handleSendComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            const res = await axiosClient.post(`/posts/${id}/comments`, { content: newComment });
            const addedComment = { ...res.data.data, author: { full_name: user.full_name, avatar_url: user.avatar_url } };
            setComments([...comments, addedComment]);
            setNewComment('');
            setPost({ ...post, comments_count: post.comments_count + 1 });
        } catch (error) { alert('Lỗi gửi bình luận'); }
    };

    if (loading) return <div className="min-h-screen pt-20 text-center text-gray-500">Đang tải bài viết...</div>;

    return (
        <div className="min-h-screen bg-gray-100 pb-10 pt-6">
            <div className="max-w-2xl mx-auto px-4">
                {/* Nút Quay lại */}
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-blue-600 font-semibold mb-4 hover:underline">
                    <ArrowLeft size={20} /> Quay lại Bảng tin
                </button>

                {/* Khung bài viết chính */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3 mb-4">
                        <UserCircle size={48} className="text-gray-400" />
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">{post.author.full_name}</h3>
                            <p className="text-sm text-gray-500">{new Date(post.created_at).toLocaleString('vi-VN')}</p>
                        </div>
                    </div>
                    
                    <p className="text-gray-800 text-lg whitespace-pre-wrap mb-4">{post.content}</p>

                    <div className="flex justify-between items-center text-gray-500 text-sm border-y py-3 mb-4">
                        <button onClick={handleToggleLike} className={`flex items-center gap-2 font-medium transition ${post.is_liked ? 'text-red-500' : 'hover:text-gray-700'}`}>
                            <Heart size={20} className={post.is_liked ? 'fill-red-500 text-red-500' : ''} />
                            {post.likes_count} lượt thích
                        </button>
                        <span>{post.comments_count} bình luận</span>
                    </div>

                    {/* Danh sách Bình luận luôn mở ở trang này */}
                    <div className="space-y-4 mb-4">
                        {comments.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                        ) : (
                            comments.map(cmt => (
                                <div key={cmt.id} className="flex gap-3">
                                    <UserCircle size={36} className="text-gray-400 shrink-0 mt-1" />
                                    <div className="bg-gray-100 px-4 py-2 rounded-2xl max-w-[85%]">
                                        <span className="font-semibold text-sm text-gray-900 block">{cmt.author.full_name}</span>
                                        <span className="text-gray-800 text-sm">{cmt.content}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Ô nhập bình luận */}
                    <form onSubmit={handleSendComment} className="flex gap-2 items-center mt-4 border-t pt-4">
                        <UserCircle size={40} className="text-gray-400 shrink-0" />
                        <div className="flex-1 relative">
                            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Viết bình luận..." className="w-full bg-gray-100 border-none rounded-full py-2.5 pl-4 pr-10 outline-none focus:ring-2 focus:ring-blue-200" />
                            <button type="submit" disabled={!newComment.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700 disabled:text-gray-300">
                                <Send size={20} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PostDetail;