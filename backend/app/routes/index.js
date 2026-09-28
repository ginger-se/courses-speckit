import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Register feature routers here as you implement them, e.g.:
router.use("/", authRoutes);
router.use("/users", userRoutes);

export default router;
