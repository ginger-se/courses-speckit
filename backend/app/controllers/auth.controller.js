import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import db from "../models/index.js";
import authConfig from "../config/auth.config.js";
import { badRequest, unauthorized } from "../helpers/errors.js";

const SALT_ROUNDS = 10;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const buildAuthResponse = (user, token) => ({
  userId: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  token,
});

const createOrReuseSession = async (user) => {
  const existingSession = await db.session.findOne({
    where: {
      userId: user.id,
      email: user.email,
      expirationDate: { [Op.gte]: new Date() },
      token: { [Op.ne]: "" },
    },
  });

  if (existingSession) {
    return existingSession.token;
  }

  const expirationDate = new Date(Date.now() + SESSION_TTL_MS);
  const token = jwt.sign({ userId: user.id, email: user.email }, authConfig.secret, { expiresIn: 86400 });

  await db.session.create({
    token,
    email: user.email,
    expirationDate,
    userId: user.id,
  });

  return token;
};

const exports = {};

exports.register = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName?.trim()) {
    throw badRequest("First name is required.");
  }
  if (!lastName?.trim()) {
    throw badRequest("Last name is required.");
  }
  if (!email?.trim()) {
    throw badRequest("Email is required.");
  }
  if (!password) {
    throw badRequest("Password is required.");
  }
  if (password.length < 8) {
    throw badRequest("Password must be at least 8 characters.");
  }

  // const existingEmail = await db.user.findOne({
  //   where: { email: email.trim() },
  // });
  // if (existingEmail) {
  //   throw badRequest("Email is already registered.");
  // }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await db.user.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    password: hashedPassword,
    role: "student",
  });

  const token = await createOrReuseSession(user);

  return res.status(201).send(buildAuthResponse(user, token));
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim()) {
    throw badRequest("Email is required.");
  }
  if (!password) {
    throw badRequest("Password");
  }

  const user = await db.user.unscoped().findOne({
    where: { email: email.trim() },
  });

  if (!user) {
    throw unauthorized("Invalid email or password.");
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw unauthorized("Invalid email or password.");
  }

  const token = await createOrReuseSession(user);

  return res.status(200).send(buildAuthResponse(user, token));
};

exports.logout = async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (token) {
    await db.session.update({ token: "" }, { where: { token } });
  }

  return res.status(200).send({ message: "Signed out successfully." });
};

export default exports;
