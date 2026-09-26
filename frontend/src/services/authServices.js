import apiClient from "./services.js";
import router from "../router.js";
import { setUser } from "../composables/useAuth.js";

const authServices = {
  registerUser(payload) {
    return apiClient.post("register", payload);
  },

  loginUser(credentials) {
    return apiClient.post("login", credentials);
  },

  async logoutUser() {
    try {
      await apiClient.post("logout");
    } finally {
      setUser(null);
      await router.push({ name: "login" });
    }
  },
};

export default authServices;
