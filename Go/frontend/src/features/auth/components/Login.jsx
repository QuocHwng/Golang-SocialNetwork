import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../../services/api/axiosClient';
import useAuthStore from '../../../store/useAuthStore';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login); // Lấy hàm login từ Zustand

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            // Gọi API sang Backend Go
            const response = await axiosClient.post('/auth/login', { email, password });
            const data = response.data.data;
            
            // Lưu vào Zustand và LocalStorage
            login(data, data.token);
            
            // Chuyển hướng về trang chủ
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng nhập thất bại');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-blue-600 mb-6">Mạng Xã Hội</h2>
                <h3 className="text-xl font-semibold text-center mb-6">Đăng Nhập</h3>
                
                {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            placeholder="Nhập email của bạn" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            placeholder="Nhập mật khẩu" />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">
                        Đăng Nhập
                    </button>
                </form>
                
                <p className="mt-4 text-center text-sm text-gray-600">
                    Chưa có tài khoản? <Link to="/register" className="text-blue-600 font-semibold hover:underline">Đăng ký ngay</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;