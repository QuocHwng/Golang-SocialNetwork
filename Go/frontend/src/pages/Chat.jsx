import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axiosClient from '../services/api/axiosClient';
import useAuthStore from '../store/useAuthStore';
import { UserCircle, Send, Info, MessageSquare, Image as ImageIcon, Trash2, Loader2, MoreVertical } from 'lucide-react';

const Chat = () => {
    const { user: currentUser } = useAuthStore();
    const location = useLocation(); 
    
    const [contacts, setContacts] = useState([]);
    const [activeContact, setActiveContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null); 
    const fileInputRef = useRef(null);

    const [isTyping, setIsTyping] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [openMenuMsgId, setOpenMenuMsgId] = useState(null);
    let typingTimeoutRef = useRef(null);

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

    useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

    useEffect(() => {
        const handleClickOutside = () => setOpenMenuMsgId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchContacts = async () => {
        try {
            const res = await axiosClient.get('/chat/contacts');
            let loadedContacts = res.data.data || [];
            if (location.state?.contact) {
                const newContact = location.state.contact;
                if (!loadedContacts.find(c => c.id === newContact.id)) {
                    loadedContacts = [newContact, ...loadedContacts];
                }
                setActiveContact(newContact);
            }
            setContacts(loadedContacts);
        } catch (error) {}
    };

    useEffect(() => { fetchContacts(); }, []);

    useEffect(() => {
        if (!activeContact) return;
        const fetchMessages = async () => {
            try {
                const res = await axiosClient.get(`/chat/${activeContact.id}`);
                setMessages(res.data.data || []);
                setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, unread_count: 0 } : c));
            } catch (error) {}
        };
        fetchMessages();
    }, [activeContact]);

    useEffect(() => {
        const handleRealtimeMessage = (e) => {
            const msg = e.detail;
            if (activeContact && (msg.sender_id === activeContact.id || msg.receiver_id === activeContact.id)) {
                setMessages(prev => [...prev, msg]);
                setIsTyping(false); 
            } else { fetchContacts(); }
        };

        const handleRecall = (e) => {
            const recalledMsgId = e.detail;
            setMessages(prev => prev.filter(m => m.id !== recalledMsgId));
        };

        const handleTypingEvent = (e) => {
            const senderId = e.detail;
            if (activeContact && senderId === activeContact.id) {
                setIsTyping(true);
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000); 
            }
        };

        const handleOnline = (e) => {
            const userId = e.detail;
            setContacts(prev => prev.map(c => c.id === userId ? { ...c, is_online: true } : c));
            if (activeContact?.id === userId) setActiveContact(prev => ({ ...prev, is_online: true }));
        };

        const handleOffline = (e) => {
            const userId = e.detail;
            setContacts(prev => prev.map(c => c.id === userId ? { ...c, is_online: false } : c));
            if (activeContact?.id === userId) setActiveContact(prev => ({ ...prev, is_online: false }));
        };

        window.addEventListener('new_message', handleRealtimeMessage);
        window.addEventListener('recall_message', handleRecall);
        window.addEventListener('typing', handleTypingEvent);
        window.addEventListener('user_online', handleOnline);
        window.addEventListener('user_offline', handleOffline);
        
        return () => {
            window.removeEventListener('new_message', handleRealtimeMessage);
            window.removeEventListener('recall_message', handleRecall);
            window.removeEventListener('typing', handleTypingEvent);
            window.removeEventListener('user_online', handleOnline);
            window.removeEventListener('user_offline', handleOffline);
        };
    }, [activeContact]);

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (activeContact) { axiosClient.post(`/chat/${activeContact.id}/typing`).catch(() => {}); }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeContact) return;
        try {
            const res = await axiosClient.post(`/chat/${activeContact.id}`, { content: newMessage });
            setMessages(prev => [...prev, res.data.data]);
            setNewMessage('');
            if (!contacts.find(c => c.id === activeContact.id)) fetchContacts();
        } catch (error) {}
    };

    const handleSendImage = async (e) => {
        const file = e.target.files[0];
        if (!file || !activeContact) return;
        setUploadingImage(true);
        try {
            const fd = new FormData(); fd.append('file', file);
            const uploadRes = await axiosClient.post('/upload', fd);
            const imageUrl = uploadRes.data.data.url;
            const res = await axiosClient.post(`/chat/${activeContact.id}`, { content: '', image_url: imageUrl });
            setMessages(prev => [...prev, res.data.data]);
            if (!contacts.find(c => c.id === activeContact.id)) fetchContacts();
        } catch (error) { alert("Lỗi gửi ảnh"); } 
        finally { setUploadingImage(false); e.target.value = null; }
    };

    const handleRecallMessage = async (msgId) => {
        if (!window.confirm("Thu hồi tin nhắn này?")) return;
        try {
            await axiosClient.delete(`/chat/messages/${msgId}?receiver_id=${activeContact.id}`);
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (error) {}
    };

    const AvatarDisplay = ({ url, sizeClass }) => (
        url ? <img src={url} alt="ava" className={`${sizeClass} object-cover rounded-full border border-stone-200 dark:border-stone-700 bg-white shrink-0`} /> 
            : <UserCircle className={`${sizeClass} text-stone-300 bg-white rounded-full shrink-0`} />
    );

    return (
        <div className="max-w-6xl mx-auto mt-4 px-4 h-[calc(100vh-100px)] pb-4">
            <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-stone-100 dark:border-stone-700 flex h-full overflow-hidden transition-colors">
                
                {/* CỘT TRÁI: DANH SÁCH */}
                <div className="w-1/3 border-r border-stone-100 dark:border-stone-700 flex flex-col bg-stone-50/50 dark:bg-stone-800/50">
                    <div className="p-5 border-b border-stone-100 dark:border-stone-700 bg-white/50 dark:bg-stone-800/80 backdrop-blur-sm">
                        <h2 className="text-xl font-black text-stone-900 dark:text-white">Tin nhắn</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {contacts.length === 0 ? (
                            <p className="text-center text-stone-400 mt-10 text-sm p-4">Bạn chưa chat với ai.</p>
                        ) : (
                            contacts.map(contact => (
                                <div key={contact.id} onClick={() => setActiveContact(contact)} className={`flex items-center gap-4 p-4 cursor-pointer transition border-b border-stone-100 dark:border-stone-700/50 ${activeContact?.id === contact.id ? 'bg-lime-50 dark:bg-stone-700' : 'hover:bg-stone-100 dark:hover:bg-stone-700/50'}`}>
                                    <div className="relative shrink-0">
                                        <AvatarDisplay url={contact.avatar_url} sizeClass="w-12 h-12" />
                                        {contact.is_online && (
                                            <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-stone-800 rounded-full"></div>
                                        )}
                                    </div>
                                    <div className="hidden sm:flex flex-col justify-center overflow-hidden flex-1">
                                        <h3 className={`font-bold truncate text-[15px] ${activeContact?.id === contact.id ? 'text-lime-700 dark:text-lime-400' : 'text-stone-800 dark:text-stone-200'}`}>{contact.full_name}</h3>
                                    </div>
                                    {contact.unread_count > 0 && activeContact?.id !== contact.id && (
                                        <div className="hidden sm:flex shrink-0 w-6 h-6 bg-rose-500 rounded-full text-white text-xs font-bold items-center justify-center">
                                            {contact.unread_count > 99 ? '99+' : contact.unread_count}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* CỘT PHẢI: KHUNG CHAT */}
                <div className="w-2/3 flex flex-col bg-white dark:bg-stone-800 relative">
                    {!activeContact ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-stone-400 dark:text-stone-500">
                            <div className="w-24 h-24 bg-stone-100 dark:bg-stone-700 rounded-full flex items-center justify-center mb-4">
                                <MessageSquare size={40} className="opacity-50" />
                            </div>
                            <p className="font-medium">Chọn một người để bắt đầu trò chuyện</p>
                        </div>
                    ) : (
                        <>
                            {/* Header khung chat */}
                            <div className="p-4 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between z-10 bg-white dark:bg-stone-800">
                                <div className="flex items-center gap-3">
                                    <div className="relative shrink-0">
                                        <AvatarDisplay url={activeContact.avatar_url} sizeClass="w-11 h-11 shadow-sm" />
                                        {activeContact.is_online && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-stone-800 rounded-full"></div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-stone-900 dark:text-white text-lg leading-tight">{activeContact.full_name}</h3>
                                        {activeContact.is_online && <span className="text-xs text-emerald-500 font-medium">Đang hoạt động</span>}
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center justify-center cursor-pointer transition text-lime-500">
                                    <Info size={22} />
                                </div>
                            </div>

                            {/* Lịch sử tin nhắn */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-stone-50 dark:bg-stone-900/30 custom-scrollbar">
                                {messages.map((msg, index) => {
                                    const isMe = msg.sender_id === currentUser.id;
                                    return (
                                        <div key={msg.id} className={`flex group ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            {isMe && (
                                                <div className="relative flex items-center mr-2 opacity-0 group-hover:opacity-100 transition">
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuMsgId(openMenuMsgId === msg.id ? null : msg.id); }} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 p-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700"><MoreVertical size={16} /></button>
                                                    {openMenuMsgId === msg.id && (
                                                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-stone-800 shadow-lg border border-stone-100 dark:border-stone-700 rounded-xl overflow-hidden z-20" onClick={(e) => e.stopPropagation()}>
                                                            <button onClick={() => { handleRecallMessage(msg.id); setOpenMenuMsgId(null); }} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 w-full whitespace-nowrap"><Trash2 size={16} /> Thu hồi</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className={`max-w-[70%] text-[15px] shadow-sm ${msg.image_url ? 'bg-transparent shadow-none' : (isMe ? 'bg-lime-500 text-white rounded-l-2xl rounded-tr-2xl px-4 py-2.5' : 'bg-white dark:bg-stone-700 border border-stone-100 dark:border-stone-600 text-stone-800 dark:text-stone-100 rounded-r-2xl rounded-tl-2xl px-4 py-2.5')}`}>
                                                {msg.image_url && <img src={msg.image_url} alt="chat" className="rounded-2xl max-w-full max-h-60 object-cover shadow-sm border border-stone-100 dark:border-stone-700" />}
                                                {msg.content && <div className={msg.image_url ? 'mt-2 bg-lime-500 text-white rounded-2xl px-4 py-2 inline-block shadow-sm' : ''}>{msg.content}</div>}
                                            </div>
                                        </div>
                                    );
                                })}

                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-white dark:bg-stone-700 border border-stone-100 dark:border-stone-600 text-stone-500 rounded-full px-4 py-2.5 flex items-center gap-1 shadow-sm">
                                            <span className="w-1.5 h-1.5 bg-stone-400 dark:bg-stone-400 rounded-full animate-bounce"></span>
                                            <span className="w-1.5 h-1.5 bg-stone-400 dark:bg-stone-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                                            <span className="w-1.5 h-1.5 bg-stone-400 dark:bg-stone-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Ô nhập */}
                            <div className="p-4 border-t border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800">
                                <form onSubmit={handleSendMessage} className="flex gap-3 items-center bg-stone-100 dark:bg-stone-700 rounded-full p-1 pl-2">
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="text-lime-500 hover:text-lime-600 dark:hover:text-lime-400 p-2 rounded-full transition hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-50">
                                        {uploadingImage ? <Loader2 size={24} className="animate-spin" /> : <ImageIcon size={24} />}
                                    </button>
                                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleSendImage} className="hidden" />
                                    <input type="text" value={newMessage} onChange={handleTyping} placeholder="Nhập tin nhắn..." className="flex-1 bg-transparent border-none py-2.5 px-2 outline-none text-stone-800 dark:text-white text-[15px]" />
                                    <button type="submit" disabled={!newMessage.trim()} className="bg-lime-500 text-white w-10 h-10 rounded-full flex justify-center items-center hover:bg-lime-600 disabled:opacity-50 disabled:bg-stone-300 dark:disabled:bg-stone-600 transition shadow-sm">
                                        <Send size={18} className="translate-x-[-1px] translate-y-[1px]" />
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Chat;