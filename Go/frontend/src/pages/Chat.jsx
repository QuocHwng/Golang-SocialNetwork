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

    // --- State cho Tính năng Nâng cao ---
    const [isTyping, setIsTyping] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [openMenuMsgId, setOpenMenuMsgId] = useState(null); // Menu thu hồi tin nhắn
    let typingTimeoutRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

    // Tắt menu khi click ra ngoài
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
        } catch (error) { console.error("Lỗi tải danh sách chat"); }
    };

    useEffect(() => { fetchContacts(); }, []);

    useEffect(() => {
        if (!activeContact) return;
        const fetchMessages = async () => {
            try {
                const res = await axiosClient.get(`/chat/${activeContact.id}`);
                setMessages(res.data.data || []);
            } catch (error) { console.error("Lỗi tải tin nhắn"); }
        };
        fetchMessages();
    }, [activeContact]);

    // LẮNG NGHE CÁC SỰ KIỆN WEBSOCKET TỪ MAIN LAYOUT
    useEffect(() => {
        const handleRealtimeMessage = (e) => {
            const msg = e.detail;
            if (activeContact && (msg.sender_id === activeContact.id || msg.receiver_id === activeContact.id)) {
                setMessages(prev => [...prev, msg]);
                setIsTyping(false); // Có tin nhắn tới thì tắt hiệu ứng typing
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
                typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000); // Tự tắt sau 3s nếu ngừng gõ
            }
        };

        window.addEventListener('new_message', handleRealtimeMessage);
        window.addEventListener('recall_message', handleRecall);
        window.addEventListener('typing', handleTypingEvent);
        
        return () => {
            window.removeEventListener('new_message', handleRealtimeMessage);
            window.removeEventListener('recall_message', handleRecall);
            window.removeEventListener('typing', handleTypingEvent);
        };
    }, [activeContact]);

    // BÁO HIỆU MÌNH ĐANG GÕ CHỮ
    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (activeContact) {
            axiosClient.post(`/chat/${activeContact.id}/typing`).catch(() => {});
        }
    };

    // GỬI TIN NHẮN (CHỮ)
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeContact) return;
        try {
            const res = await axiosClient.post(`/chat/${activeContact.id}`, { content: newMessage });
            setMessages(prev => [...prev, res.data.data]);
            setNewMessage('');
            if (!contacts.find(c => c.id === activeContact.id)) fetchContacts();
        } catch (error) { alert("Lỗi gửi tin nhắn"); }
    };

    // GỬI TIN NHẮN (ẢNH)
    const handleSendImage = async (e) => {
        const file = e.target.files[0];
        if (!file || !activeContact) return;
        
        setUploadingImage(true);
        try {
            // 1. Up ảnh lên Cloudinary
            const fd = new FormData();
            fd.append('file', file);
            const uploadRes = await axiosClient.post('/upload', fd);
            const imageUrl = uploadRes.data.data.url;

            // 2. Gửi tin nhắn chứa link ảnh
            const res = await axiosClient.post(`/chat/${activeContact.id}`, { content: '', image_url: imageUrl });
            setMessages(prev => [...prev, res.data.data]);
            if (!contacts.find(c => c.id === activeContact.id)) fetchContacts();
        } catch (error) { alert("Lỗi gửi ảnh"); } 
        finally { 
            setUploadingImage(false);
            e.target.value = null; // Reset input file
        }
    };

    // THU HỒI TIN NHẮN
    const handleRecallMessage = async (msgId) => {
        if (!window.confirm("Bạn có chắc muốn thu hồi tin nhắn này?")) return;
        try {
            await axiosClient.delete(`/chat/messages/${msgId}?receiver_id=${activeContact.id}`);
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (error) { alert(error.response?.data?.message || "Lỗi thu hồi tin nhắn"); }
    };

    const AvatarDisplay = ({ url, sizeClass }) => (
        url ? <img src={url} alt="ava" className={`${sizeClass} object-cover rounded-full border bg-white shrink-0`} /> 
            : <UserCircle className={`${sizeClass} text-gray-300 bg-white rounded-full shrink-0`} />
    );

    return (
        <div className="max-w-5xl mx-auto mt-4 px-4 h-[calc(100vh-100px)]">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex h-full overflow-hidden">
                
                {/* CỘT TRÁI: DANH SÁCH LIÊN HỆ */}
                <div className="w-1/3 border-r flex flex-col bg-gray-50">
                    <div className="p-4 border-b bg-white">
                        <h2 className="text-xl font-bold text-gray-800">Đoạn chat</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {contacts.length === 0 ? (
                            <p className="text-center text-gray-400 mt-10 text-sm p-4">Chưa có cuộc trò chuyện nào.</p>
                        ) : (
                            contacts.map(contact => (
                                <div 
                                    key={contact.id} 
                                    onClick={() => setActiveContact(contact)}
                                    className={`flex items-center gap-3 p-4 cursor-pointer transition border-b border-gray-100 ${activeContact?.id === contact.id ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                                >
                                    <AvatarDisplay url={contact.avatar_url} sizeClass="w-12 h-12" />
                                    <div className="hidden sm:block">
                                        <h3 className={`font-semibold ${activeContact?.id === contact.id ? 'text-blue-700' : 'text-gray-800'}`}>{contact.full_name}</h3>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* CỘT PHẢI: KHUNG CHAT */}
                <div className="w-2/3 flex flex-col bg-white relative">
                    {!activeContact ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <MessageSquare size={64} className="mb-4 opacity-50" />
                            <p>Chọn một người để bắt đầu trò chuyện</p>
                        </div>
                    ) : (
                        <>
                            {/* Header khung chat */}
                            <div className="p-4 border-b flex items-center justify-between shadow-sm z-10 bg-white">
                                <div className="flex items-center gap-3">
                                    <AvatarDisplay url={activeContact.avatar_url} sizeClass="w-10 h-10" />
                                    <h3 className="font-bold text-gray-800 text-lg">{activeContact.full_name}</h3>
                                </div>
                                <Info className="text-blue-500 cursor-pointer hover:text-blue-700" />
                            </div>

                            {/* Lịch sử tin nhắn */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                                {messages.map((msg, index) => {
                                    const isMe = msg.sender_id === currentUser.id;
                                    return (
                                        <div key={msg.id} className={`flex group ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            
                                            {/* Nút Thu hồi (Chỉ hiện của mình khi hover) */}
                                            {isMe && (
                                                <div className="relative flex items-center mr-2 opacity-0 group-hover:opacity-100 transition">
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuMsgId(openMenuMsgId === msg.id ? null : msg.id); }} className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200">
                                                        <MoreVertical size={16} />
                                                    </button>
                                                    {openMenuMsgId === msg.id && (
                                                        <div className="absolute right-0 top-full mt-1 bg-white shadow-lg border rounded-lg overflow-hidden z-20" onClick={(e) => e.stopPropagation()}>
                                                            <button onClick={() => { handleRecallMessage(msg.id); setOpenMenuMsgId(null); }} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full whitespace-nowrap">
                                                                <Trash2 size={14} /> Thu hồi
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Bong bóng tin nhắn */}
                                            <div className={`max-w-[70%] text-sm shadow-sm ${msg.image_url ? 'bg-transparent shadow-none' : (isMe ? 'bg-blue-600 text-white rounded-l-2xl rounded-tr-2xl px-4 py-2' : 'bg-white border text-gray-800 rounded-r-2xl rounded-tl-2xl px-4 py-2')}`}>
                                                {/* Hiển thị Ảnh nếu có */}
                                                {msg.image_url && (
                                                    <img src={msg.image_url} alt="chat-img" className="rounded-2xl max-w-full max-h-60 object-cover shadow-sm border border-gray-100" />
                                                )}
                                                {/* Hiển thị chữ nếu có */}
                                                {msg.content && <div className={msg.image_url ? 'mt-2 bg-blue-600 text-white rounded-2xl px-4 py-2 inline-block' : ''}>{msg.content}</div>}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Hiệu ứng Đang gõ... */}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-white border text-gray-500 rounded-full px-4 py-2 flex items-center gap-1 shadow-sm">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                                        </div>
                                    </div>
                                )}
                                
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Ô nhập tin nhắn */}
                            <div className="p-3 border-t bg-white">
                                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                    {/* Nút gửi ảnh */}
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="text-gray-500 hover:text-green-500 p-2 rounded-full transition disabled:opacity-50">
                                        {uploadingImage ? <Loader2 size={24} className="animate-spin text-green-500" /> : <ImageIcon size={24} />}
                                    </button>
                                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleSendImage} className="hidden" />

                                    <input 
                                        type="text" 
                                        value={newMessage} 
                                        onChange={handleTyping} // Đã thêm sự kiện bắt gõ phím
                                        placeholder="Nhập tin nhắn..." 
                                        className="flex-1 bg-gray-100 border-none rounded-full py-2.5 px-5 outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                    <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 disabled:opacity-50 transition">
                                        <Send size={20} className="translate-x-[-1px]" />
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