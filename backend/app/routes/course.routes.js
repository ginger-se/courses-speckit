import { Router } from "express";
import courseController from "../controllers/course.controller.js";
import { authenticate, authenticateAdmin } from "../authorization/authorization.js";
import { idParam, validate } from "../helpers/validate.js";
import { courseSchema } from "../shared/schemas/course.js";

const router = Router();

router.param("id", idParam);

router.get("/", [authenticate], courseController.findAll);
router.get("/:id", [authenticate], courseController.findOne);
router.post("/", [authenticateAdmin, validate({ body: courseSchema })], courseController.create);
router.put("/:id", [authenticateAdmin, validate({ body: courseSchema })], courseController.update);
router.delete("/:id", [authenticateAdmin], courseController.remove);

export default router;
