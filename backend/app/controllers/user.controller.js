import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import db from "../models/index.js";
import { badRequest, notFound } from "../helpers/errors.js";

const SALT_ROUNDS = 10;

const exports = {};

exports.findAll = async (req, res) => {
  const users = await db.user.findAll({
    attributes: ["id", "firstName", "lastName", "email"],
    order: [
      ["lastName", "ASC"],
      ["firstName", "ASC"],
    ],
  });

  return res.send(users);
};

exports.findOne = async (req, res) => {
  const userId = req.ids.id;

  const user = await db.user.findByPk(userId);
  if (!user) {
    throw notFound("user", userId);
  }

  return res.send(user);
};

exports.update = async (req, res) => {
  const userId = req.ids.id;

  const user = await db.user.unscoped().findByPk(userId);
  if (!user) {
    throw notFound("user", userId);
  }

  const { firstName, lastName, email, password, role } = req.body;

  if (!firstName?.trim()) {
    throw badRequest("First name is required");
  }
  if (!lastName?.trim()) {
    throw badRequest("Last name is required");
  }
  if (!email?.trim()) {
    throw badRequest("Email is required");
  }

  const trimmedEmail = email.trim();

  const existingEmail = await db.user.findOne({
    where: {
      email: trimmedEmail,
      id: { [Op.ne]: user.id },
    },
  });
  if (existingEmail) {
    throw badRequest("Email is already registered.");
  }

  if (password !== undefined && password !== null && password !== "") {
    if (password.length < 8) {
      throw badRequest("Password must be at least 8 characters.");
    }

    user.password = await bcrypt.hash(password, SALT_ROUNDS);
  }

  user.firstName = firstName.trim();
  user.lastName = lastName.trim();
  user.email = trimmedEmail;
  if (role !== undefined && role !== null && String(role).trim()) {
    user.role = String(role).trim();
  }

  await user.save();

  const updatedUser = await db.user.findByPk(userId);
  return res.send(updatedUser);
};

export default exports;
