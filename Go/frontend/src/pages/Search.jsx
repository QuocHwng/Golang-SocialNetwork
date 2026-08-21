import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axiosClient from '../services/api/axiosClient';
import { UserCircle, Search as SearchIcon, Loader2, Globe, Heart, MessageCircle, MoreHorizontal, Flag } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const Search = () => {
    const { user: currentUser } = useAuthStore();
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    
    const [tab, setTab] = useState('users'); // 'users' hoặc 'posts'
    const [userResults, setUserResults] = useState([]);
    const [postResults, setPostResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openPostMenuId, setOpenPostMenuId] = useState(null);

    useEffect(() => {
        const handleClickOutside = () => setOpenPostMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!query) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        if (tab === 'users') {
            axiosClient.get(`/users/search?q=${query}`)
                .then(res => setUserResults(res.data.data || []))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        } else {
            axiosClient.get(`/posts/search?q=${query}`)
                .then(res => setPostResults(res.data.data || []))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [query, tab]);

    const AvatarDisplay = ({ url, sizeClass }) => (
        url ? <img src={url} alt="ava" className={`${sizeClass} object-cover rounded-full border border-stone-200 dark:border-stone-700 bg-white shrink-0`} /> 
            : <UserCircle className={`${sizeClass} text-stone-300 bg-white rounded-full shrink-0`} />
    );

    return (
        <div className="max-w-4xl mx-auto mt-6 px-4 pb-10">
            <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 mb-6 transition-colors">
                <h1 className="text-2xl font-black text-stone-900 dark:text-white flex items-center gap-3">
                    <SearchIcon size={28} className="text-lime-500" />
                    Kết quả tìm kiếm cho: "{query}"
                </h1>
                <div className="flex gap-4 mt-6 border-b border-stone-100 dark:border-stone-700">
                    <button 
                        onClick={() => setTab('users')}
                        className={`pb-3 font-semibold transition ${tab === 'users' ? 'text-lime-500 border-b-2 border-lime-500' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
                    >Mọi người</button>
                    <button 
                        onClick={() => setTab('posts')}
                        className={`pb-3 font-semibold transition ${tab === 'posts' ? 'text-lime-500 border-b-2 border-lime-500' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
                    >Bài viết</button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-lime-500" size={40} /></div>
            ) : tab === 'users' ? (
                userResults.length === 0 ? (
                    <div className="bg-white dark:bg-stone-800 p-10 text-center rounded-3xl border border-stone-100 dark:border-stone-700">
                        <p className="text-stone-500 dark:text-stone-400 text-lg">Không tìm thấy người dùng nào.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {userResults.map(user => (
                            <Link 
                                key={user.id} 
                                to={`/profile/${user.id}`}
                                className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700 flex items-center gap-4 hover:shadow-md transition-shadow group"
                            >
                                <AvatarDisplay url={user.avatar_url} sizeClass="w-16 h-16 group-hover:scale-105 transition-transform" />
                                <div className="flex-1 overflow-hidden">
                                    <h3 className="font-bold text-lg text-stone-900 dark:text-white truncate">{user.full_name}</h3>
                                    <p className="text-sm text-stone-500 dark:text-stone-400 truncate">@{user.username}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )
            ) : (
                postResults.length === 0 ? (
                    <div className="bg-white dark:bg-stone-800 p-10 text-center rounded-3xl border border-stone-100 dark:border-stone-700">
                        <p className="text-stone-500 dark:text-stone-400 text-lg">Không tìm thấy bài viết nào.</p>
                    </div>
                ) : (
                    <div className="space-y-6 max-w-2xl mx-auto">
                        {postResults.map(post => (
                            <div key={post.id} className="bg-white dark:bg-stone-800 p-5 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-stone-100 dark:border-stone-700 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-3 items-center">
                                        <AvatarDisplay url={post.author?.avatar_url} sizeClass="w-12 h-12 shadow-sm" />
                                        <div>
                                            <Link to={`/profile/${post.author?.id}`} className="font-bold text-stone-900 dark:text-stone-100 text-[16px] hover:underline">{post.author?.full_name}</Link>
                                            <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                                <span>{new Date(post.created_at).toLocaleString('vi-VN')}</span>
                                                <span>•</span><Globe size={12} />
                                            </div>
                                        </div>
                                    </div>

                                    {currentUser?.id !== post.author?.id && (
                                        <div className="relative">
                                            <button onClick={(e) => { e.stopPropagation(); setOpenPostMenuId(openPostMenuId === post.id ? null : post.id); }} className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"><MoreHorizontal size={20} /></button>
                                            {openPostMenuId === post.id && (
                                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-2xl shadow-xl overflow-hidden z-10 p-2" onClick={(e) => e.stopPropagation()}>
                                                    <button onClick={() => {
                                                        const reason = prompt("Lý do báo cáo bài viết này:");
                                                        if (reason) {
                                                            axiosClient.post(`/posts/${post.id}/report`, { reason }).then(res => alert(res.data.message)).catch(e => alert("Lỗi khi báo cáo"));
                                                        }
                                                        setOpenPostMenuId(null);
                                                    }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition">
                                                        <Flag size={16} /> Báo cáo bài viết
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p className="text-stone-800 dark:text-stone-200 whitespace-pre-wrap text-[16px] leading-relaxed mb-4">{post.content}</p>
                                {post.media && post.media.length > 0 && (
                                    <div className={`grid gap-2 mb-4 ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                        {post.media.map(m => m.media_type === 'video' ? 
                                            <video key={m.id} src={m.media_url} controls className="w-full h-auto rounded-2xl max-h-[500px] bg-black object-contain" /> :
                                            <img key={m.id} src={m.media_url} alt="media" className="w-full h-auto rounded-2xl max-h-[500px] object-cover" />
                                        )}
                                    </div>
                                )}
                                <div className="flex gap-4 pt-3 mt-3 border-t border-stone-100 dark:border-stone-700 text-stone-500">
                                    <span className="flex items-center gap-1 text-sm font-semibold"><Heart size={18} /> {post.likes_count}</span>
                                    <span className="flex items-center gap-1 text-sm font-semibold"><MessageCircle size={18} /> {post.comments_count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

export default Search;