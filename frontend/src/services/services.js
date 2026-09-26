import axios from "axios";
import router from "../router.js";
import { setUser, user } from "../composables/useAuth.js";

const apiClient = axios.create({
  baseURL: import.meta.env.DEV ? "http://localhost:3200/api/" : "/course-t1/",
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (user.value?.token) {
    config.headers.Authorization = `Bearer ${user.value.token}`;
  }

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setUser(null);
      if (router.hasRoute("login")) {
        router.push({ name: "login" });
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
