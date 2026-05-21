import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api"
});

// Request interceptor - Add token and log
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Log request in development
  if (process.env.NODE_ENV === "development" || import.meta.env.DEV) {
    console.log(`[API] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
      headers: config.headers,
      params: config.params,
      data: config.data,
    });
  }
  
  return config;
});

// Response interceptor - Log and handle errors
api.interceptors.response.use(
  (response) => {
    // Log successful response in development
    if (process.env.NODE_ENV === "development" || import.meta.env.DEV) {
      console.log(`[API] ← ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        data: response.data,
      });
    }
    return response;
  },
  async (error) => {
    // Log error details
    console.error(`[API] ✗ ERROR ${error.response?.status || "???"} ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    
    const refreshToken = localStorage.getItem("refreshToken");
    if (error.response?.status === 401 && refreshToken && !error.config._retry) {
      error.config._retry = true;
      try {
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refresh_token: refreshToken });
        localStorage.setItem("accessToken", data.access_token);
        localStorage.setItem("refreshToken", data.refresh_token);
        error.config.headers.Authorization = `Bearer ${data.access_token}`;
        return api(error.config);
      } catch (refreshError) {
        console.error("[API] Token refresh failed, logging out", refreshError);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.assign("/auth");
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { api };
