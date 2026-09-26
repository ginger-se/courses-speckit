import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils.js";
import Login from "./views/Login.vue";
import Register from "./views/Register.vue";
import Courses from "./views/Courses.vue";
import { syncUser } from "./composables/useAuth.js";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/login", name: "login", component: Login, meta: { public: true } },
    { path: "/register", name: "register", component: Register, meta: { public: true } },
    {
      path: "/",
      name: "home",
      component: Courses,
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "home" },
    },
  ],
});

router.beforeEach((to) => {
  const user = syncUser();

  if (!user && !to.meta.public) {
    return { name: "login" };
  }
  if (user && to.meta.public) {
    return { name: "home" };
  }
});

export default router;
