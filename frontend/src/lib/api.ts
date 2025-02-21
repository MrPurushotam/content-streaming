import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL}/api/v1/`,
  headers: {
    "Content-Type": "application/json",
  },
});

const additionalHeaders: Record<string, string> = {};

// Function to set additional headers dynamically
export const setHeader = (key: string = "", value: string | null = "") => {
  if (value) {
    additionalHeaders[key] = value;
  } else {
    delete additionalHeaders[key]; // Remove header if value is falsy
  }
};

// Add a request interceptor to dynamically set the token and additional headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const adminToken = localStorage.getItem("adminToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (adminToken) {
    config.headers["x-admin-token"] = adminToken;
  }

  // Attach any dynamically set headers
  Object.entries(additionalHeaders).forEach(([key, value]) => {
    config.headers[key] = value;
  });

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
