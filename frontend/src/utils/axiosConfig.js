import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `JWT ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el token expiró y hay refresh, intenta renovarlo
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem("refresh")
    ) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(
          `${process.env.REACT_APP_API_URL}/auth/jwt/refresh/`,
          { refresh: localStorage.getItem("refresh") }
        );
        localStorage.setItem("access", res.data.access);
        originalRequest.headers.Authorization = `JWT ${res.data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Si no se pudo renovar, limpia sesión
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;