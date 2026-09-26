import { badRequest } from "./errors";

export const validate = (schemas) => (req, _res, next) => {
  req.valid = {};

  for (const [part, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(req[part] ?? {});
    if (!result.success) {
      throw badRequest(result.error.issues[0].message);
    }

    req.valid[part] = result.data;
  }

  next();
};

export const idParam = (req, _res, next, value, name) => {
  if (!/^\d+$/.test(value)) {
    throw badRequest(`Invalid ${name}`);
  }

  req.ids = { ...req.ids, [name]: Number(value) };
  next();
};


