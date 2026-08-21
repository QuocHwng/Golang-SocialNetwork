import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../services/api/axiosClient';
import { Users, Plus, Image as ImageIcon, Loader2, X } from 'lucide-react';

const Groups = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- State tạo nhóm ---
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroup, setNewGroup] = useState({ name: '', description: '' });
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const fetchGroups = async () => {
        try {
            const res = await axiosClient.get('/groups');
            setGroups(res.data.data || []);
        } catch (error) { console.error("Lỗi tải danh sách nhóm"); } finally { setLoading(false); }
    };

    useEffect(() => { fetchGroups(); }, []);

    // Xử lý chọn ảnh bìa nhóm
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroup.name.trim()) return;
        setUploading(true);

        try {
            let coverUrl = '';
            if (coverFile) {
                const fd = new FormData(); fd.append('file', coverFile);
                const uploadRes = await axiosClient.post('/upload', fd);
                coverUrl = uploadRes.data.data.url;
            }

            await axiosClient.post('/groups', { ...newGroup, cover_url: coverUrl });
            setShowCreateModal(false);
            setNewGroup({ name: '', description: '' });
            setCoverFile(null); setCoverPreview('');
            fetchGroups(); // Load lại list
        } catch (error) { alert("Lỗi tạo nhóm"); } finally { setUploading(false); }
    };

    return (
        <div className="max-w-5xl mx-auto mt-6 px-4 pb-10">
            <div className="flex justify-between items-center mb-6 bg-white dark:bg-stone-800 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700">
                <h1 className="text-2xl font-black text-stone-900 dark:text-white flex items-center gap-3">
                    <Users className="text-lime-500" size={28} /> Khám phá Cộng đồng
                </h1>
                <button onClick={() => setShowCreateModal(true)} className="bg-lime-500 text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-lime-600 transition shadow-sm flex items-center gap-2">
                    <Plus size={20} /> Tạo nhóm mới
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-lime-500" size={40} /></div>
            ) : groups.length === 0 ? (
                <div className="text-center text-stone-500 dark:text-stone-400 mt-10">Chưa có nhóm nào. Hãy là người đầu tiên tạo cộng đồng!</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map(group => (
                        <Link key={group.id} to={`/groups/${group.id}`} className="bg-white dark:bg-stone-800 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 overflow-hidden hover:shadow-md transition group">
                            <div className="h-32 bg-stone-200 dark:bg-stone-700 overflow-hidden relative">
                                {group.cover_url ? (
                                    <img src={group.cover_url} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-tr from-lime-300 to-emerald-500"></div>
                                )}
                            </div>
                            <div className="p-5">
                                <h3 className="font-bold text-lg text-stone-900 dark:text-white truncate mb-1">{group.name}</h3>
                                <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2 min-h-[40px] mb-3">{group.description || 'Chưa có mô tả.'}</p>
                                <div className="flex items-center gap-2 text-sm font-semibold text-lime-600 dark:text-lime-400 bg-lime-50 dark:bg-stone-700/50 w-fit px-3 py-1 rounded-full">
                                    <Users size={16} /> {group.members_count} thành viên
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* MODAL TẠO NHÓM */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl w-full max-w-md shadow-2xl relative border dark:border-stone-700">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 dark:text-stone-500 dark:hover:text-white"><X size={24} /></button>
                        <h2 className="text-2xl font-black mb-6 text-stone-900 dark:text-white text-center">Tạo cộng đồng mới</h2>
                        
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            {/* Ảnh bìa */}
                            <div className="relative h-32 bg-stone-100 dark:bg-stone-700 rounded-2xl flex items-center justify-center border-2 border-dashed border-stone-300 dark:border-stone-600 overflow-hidden cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-600 transition" onClick={() => fileInputRef.current?.click()}>
                                {coverPreview ? (
                                    <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-stone-400 dark:text-stone-500"><ImageIcon size={32} className="mb-2" /> <span>Tải ảnh bìa lên</span></div>
                                )}
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                            </div>

                            <div>
                                <label className="text-sm font-bold text-stone-700 dark:text-stone-300 ml-1">Tên nhóm</label>
                                <input type="text" required value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} className="w-full bg-stone-50 dark:bg-stone-700 dark:text-white border-2 border-transparent rounded-2xl p-3 mt-1 outline-none focus:border-lime-500 transition" placeholder="Ví dụ: Hội yêu code..." />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-stone-700 dark:text-stone-300 ml-1">Mô tả nhóm</label>
                                <textarea value={newGroup.description} onChange={e => setNewGroup({...newGroup, description: e.target.value})} className="w-full bg-stone-50 dark:bg-stone-700 dark:text-white border-2 border-transparent rounded-2xl p-3 mt-1 resize-none h-24 outline-none focus:border-lime-500 transition" placeholder="Nhóm này dùng để làm gì?"></textarea>
                            </div>
                            <button type="submit" disabled={uploading || !newGroup.name.trim()} className="w-full bg-lime-500 text-white font-bold py-3.5 rounded-2xl hover:bg-lime-600 disabled:opacity-50 transition mt-2">
                                {uploading ? 'Đang tạo...' : 'Tạo nhóm ngay'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Groups;