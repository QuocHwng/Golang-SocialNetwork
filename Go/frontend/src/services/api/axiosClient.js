import axios from 'axios';

const axiosClient = axios.create({
    baseURL: 'http://localhost:8080/api/v1', // Trỏ thẳng vào Backend Go của ta
    // ĐÃ XÓA CÁI BLOCK HEADERS Ở ĐÂY ĐỂ AXIOS TỰ DO QUYẾT ĐỊNH
});

// Interceptor: Đứng giữa để tự động nhét Token vào mọi Request
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default axiosClient;