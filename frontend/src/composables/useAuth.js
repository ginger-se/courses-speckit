import { computed, ref } from "vue";
import Utils from "../config/utils";

export const user = ref(Utils.getStore("user"));

export const setUser = (value) => {
  if (value) {
    Utils.setStore("user", value);
  } else {
    Utils.removeItem("user");
  }

  user.value = value;
};

export const syncUser = () => {
  user.value = Utils.getStore("user");
  return user.value;
};

export function useAuth() {
  return {
    user,
    isAdmin: computed(() => user.value?.role === "admin"),
    setUser,
  };
}
