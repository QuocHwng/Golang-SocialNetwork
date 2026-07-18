import { create } from 'zustand';

const useAuthStore = create((set) => ({
    // Đọc từ bộ nhớ trình duyệt xem có sẵn user chưa
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'), // Có token là true, không là false

    // Hành động Đăng nhập
    login: (userData, token) => {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);
        set({ user: userData, token: token, isAuthenticated: true });
    },

    // Hành động Đăng xuất
    logout: () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
    },
    updateUser: (newUserData) => {
        localStorage.setItem('user', JSON.stringify(newUserData));
        set({ user: newUserData });
    }
}));

// DÒNG QUAN TRỌNG ĐỂ XUẤT FILE NÀY RA CHO LOGIN DÙNG:
export default useAuthStore;