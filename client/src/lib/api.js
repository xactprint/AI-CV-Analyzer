import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 180000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cv_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 on anything other than the initial /auth/me probe means the token is
    // dead: clear it and bounce to login rather than showing a broken page.
    if (error.response?.status === 401) {
      const isAuthProbe = error.config?.url?.includes("/auth/me");
      if (!isAuthProbe) {
        localStorage.removeItem("cv_token");
        localStorage.removeItem("cv_user");
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login?expired=1";
        }
      }
    }

    const message =
      error.response?.data?.message ||
      (error.code === "ECONNABORTED"
        ? "The request took too long. The AI service may be busy — please try again."
        : error.request
          ? "We could not reach the server. Is the backend running on port 5000?"
          : error.message);

    return Promise.reject({
      status: error.response?.status,
      message,
      details: error.response?.data?.details,
    });
  }
);

/* ----------------------------- auth ----------------------------- */

export const authApi = {
  register: (payload) => api.post("/auth/register", payload).then((r) => r.data),
  login: (payload) => api.post("/auth/login", payload).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  updateProfile: (payload) => api.put("/auth/profile", payload).then((r) => r.data),
  changePassword: (payload) => api.put("/auth/password", payload).then((r) => r.data),
};

/* ---------------------------- resumes ---------------------------- */

export const resumeApi = {
  upload: (formData, onProgress) =>
    api
      .post("/resumes/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onProgress,
      })
      .then((r) => r.data),
  list: () => api.get("/resumes").then((r) => r.data),
  get: (id) => api.get(`/resumes/${id}`).then((r) => r.data),
  update: (id, payload) => api.patch(`/resumes/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/resumes/${id}`).then((r) => r.data),
  fileUrl: (id) => `${BASE_URL}/resumes/${id}/file`,
};

/* --------------------------- analysis --------------------------- */

export const analysisApi = {
  create: (resumeId) => api.post(`/analysis/${resumeId}`).then((r) => r.data),
  get: (resumeId) => api.get(`/analysis/${resumeId}`).then((r) => r.data),
  list: (limit = 10) => api.get("/analysis", { params: { limit } }).then((r) => r.data),
  improve: (resumeId) => api.post(`/analysis/${resumeId}/improve`).then((r) => r.data),
  compare: (a, b) => api.get("/analysis/compare", { params: { a, b } }).then((r) => r.data),
};

/* ----------------------------- jobs ----------------------------- */

export const jobApi = {
  create: (payload) => api.post("/jobs", payload).then((r) => r.data),
  list: (params) => api.get("/jobs", { params }).then((r) => r.data),
  get: (id) => api.get(`/jobs/${id}`).then((r) => r.data),
  update: (id, payload) => api.put(`/jobs/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/jobs/${id}`).then((r) => r.data),
};

/* ---------------------------- matches --------------------------- */

export const matchApi = {
  create: (jobId, resumeId) =>
    api.post(`/jobs/${jobId}/match/${resumeId}`).then((r) => r.data),
  forJob: (jobId, params) =>
    api.get(`/jobs/${jobId}/matches`, { params }).then((r) => r.data),
  list: (params) => api.get("/matches", { params }).then((r) => r.data),
  get: (id) => api.get(`/matches/${id}`).then((r) => r.data),
  remove: (id) => api.delete(`/matches/${id}`).then((r) => r.data),
};

export default api;
