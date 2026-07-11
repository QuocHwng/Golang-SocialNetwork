import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../../services/api/axiosClient';

const Register = () => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '', full_name: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        try {
            // Gọi API Đăng ký
            await axiosClient.post('/auth/register', formData);
            alert("Đăng ký thành công! Vui lòng đăng nhập.");
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng ký thất bại');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-blue-600 mb-6">Mạng Xã Hội</h2>
                <h3 className="text-xl font-semibold text-center mb-4">Tạo Tài Khoản Mới</h3>
                
                {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập (Username)</label>
                        <input type="text" name="username" required onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Họ và Tên</label>
                        <input type="text" name="full_name" required onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" name="email" required onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                        <input type="password" name="password" required minLength="6" onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition">
                        Đăng Ký
                    </button>
                </form>
                
                <p className="mt-4 text-center text-sm text-gray-600">
                    Đã có tài khoản? <Link to="/login" className="text-blue-600 font-semibold hover:underline">Đăng nhập</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;