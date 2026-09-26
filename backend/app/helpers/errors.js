import { UniqueConstraintError } from "sequelize";
import logger from "../config/logger.js";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const unauthorized = (message) => new HttpError(401, message);
export const forbidden = () => new HttpError(403, "Not Authorized");
export const notFound = (label, id) => new HttpError(404, `${label} with id=${id} not found.`);

export const errorHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).send({ message: err.message });
  }

  if (err instanceof UniqueConstraintError) {
    return res.status(400).send({ message: err.errors[0]?.message ?? "That value is already taken." });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).send({ message: "Request body is not valid JSON." });
  }

  logger.error(`${req.method} ${req.originalUrl} failed: ${err.stack ?? err.message}`);
  return res.status(500).send({ message: "Something went wrong." });
};
