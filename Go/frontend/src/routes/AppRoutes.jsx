import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../features/auth/components/Login';
import Register from '../features/auth/components/Register';
import Home from '../pages/Home';
import Profile from '../pages/Profile';
import PostDetail from '../pages/PostDetail';
import MainLayout from '../layouts/MainLayout';
import useAuthStore from '../store/useAuthStore';
import Search from '../pages/Search';
import Groups from '../pages/Groups';
import GroupDetail from '../pages/GroupDetail';
import SavedPosts from '../pages/SavedPosts';

import Chat from '../pages/Chat';

const AppRoutes = () => {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);

    return (
        <Routes>
            {/* Các trang KHÔNG cần Layout (Đăng nhập, Đăng ký) */}
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />

            {/* Các trang CẦN Layout (Phải bọc trong MainLayout) */}
            <Route element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}>
                <Route path="/" element={<Home />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/post/:id" element={<PostDetail />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/search" element={<Search />} />
                <Route path="/saved" element={<SavedPosts />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/groups/:id" element={<GroupDetail />} />
            </Route>
        </Routes>
    );
};
export default AppRoutes;