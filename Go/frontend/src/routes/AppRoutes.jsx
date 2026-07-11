import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../features/auth/components/Login';
import Register from '../features/auth/components/Register';
import Home from '../pages/Home'; // Import trang Home thật
import useAuthStore from '../store/useAuthStore';
import PostDetail from '../pages/PostDetail';

const AppRoutes = () => {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);

    return (
        <Routes>
            <Route path="/" element={isAuthenticated ? <Home /> : <Navigate to="/login" />} />
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
            <Route path="/post/:id" element={isAuthenticated ? <PostDetail /> : <Navigate to="/login" />} />
        </Routes>
    );
};

export default AppRoutes;