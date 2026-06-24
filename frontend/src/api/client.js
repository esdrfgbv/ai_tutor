import axios from "axios";

const BASE_API = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "") + "/api";

const api = axios.create({
  baseURL: BASE_API,
});

// ─── Refresh-token deduplication ────────────────────────────────────────────
// Only ONE refresh request may be in flight at any time.
// All concurrent 401s queue behind this promise and share the result.
let _refreshPromise = null;

function _doRefresh() {
  if (_refreshPromise) return _refreshPromise;

  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return Promise.reject(new Error("No refresh token"));

  _refreshPromise = axios
    .post(`${BASE_API}/auth/refresh`, { refresh_token: refreshToken })
    .then(({ data }) => {
      localStorage.setItem("accessToken", data.access_token);
      localStorage.setItem("refreshToken", data.refresh_token);
      return data.access_token;
    })
    .catch((err) => {
      // Refresh itself failed — clear auth and force login
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.assign("/auth");
      return Promise.reject(err);
    })
    .finally(() => {
      // Always clear the singleton so the next legitimate 401 can refresh again
      _refreshPromise = null;
    });

  return _refreshPromise;
}
// ────────────────────────────────────────────────────────────────────────────

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (import.meta.env.DEV) {
    console.log(`[API] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  }

  return config;
});

// Response interceptor — handle 401 with deduplicated refresh
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`[API] ← ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config;

    console.error(
      `[API] ✗ ${status ?? "ERR"} ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`,
      error.response?.data ?? error.message,
    );

    // Only attempt refresh once per original request (_retry guard)
    if (status === 401 && !originalRequest._retry && localStorage.getItem("refreshToken")) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await _doRefresh();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // _doRefresh already cleared localStorage and redirected
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
export { api };
