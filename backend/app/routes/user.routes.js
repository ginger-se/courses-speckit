import { Router } from "express";
import userController from "../controllers/user.controller.js";
import { authenticate, authenticateAdmin } from "../authorization/authorization.js";
import { idParam } from "../helpers/validate.js";

const router = Router();

router.param("id", idParam);

router.get("/", [authenticateAdmin], userController.findAll);
router.get("/:id", [authenticate], userController.findOne);
router.put("/:id", [authenticate], userController.update);

export default router;
