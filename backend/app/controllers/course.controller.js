import db from "../models/index.js";
import { parseToNumber } from "../helpers/fields.js";
import { Op } from "sequelize";
import { DEPARTMENTS, FREQUENCIES, SEMESTERS } from "../shared/constants.js";
import { badRequest, notFound } from "../helpers/errors.js";

const SORTABLE = ["number", "name", "hours", "department"];
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// AI helped with this function
// "a,b" or ?x=a&x=b  ->  ["a", "b"]
const toList = (value) =>
  value === undefined
    ? []
    : []
        .concat(value)
        .flatMap((v) => String(v).split(","))
        .map((v) => v.trim())
        .filter(Boolean);

const escapeLike = (value) => value.replace(/[\\%_]/g, "\\$&");

const exports = {};

exports.findAll = async (req, res) => {
  const page = Math.max(parseToNumber(req.query.page) ?? 1, 1);
  const pageSize = Math.min(Math.max(parseToNumber(req.query.pageSize) ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const words = String(req.query.q ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const departments = toList(req.query.department);
  const semesters = toList(req.query.semester);
  const frequencies = toList(req.query.frequency);
  const sortParam = String(req.query.sort ?? "number");
  const sortField = sortParam.replace(/^-/, "");

  if (!departments.every((d) => DEPARTMENTS.includes(d))) {
    throw badRequest(`Department must be one of ${DEPARTMENTS.join(", ")}.`);
  }

  if (!semesters.every((s) => SEMESTERS.includes(s))) {
    throw badRequest(`Semester must be one or more of ${SEMESTERS.join(", ")}.`);
  }

  if (!frequencies.every((f) => FREQUENCIES.includes(f))) {
    throw badRequest(`Frequency must be one of ${FREQUENCIES.join(", ")}.`);
  }

  if (!SORTABLE.includes(sortField)) {
    throw badRequest(`Sort must be one of ${SORTABLE.join(", ")}.`);
  }

  const and = [];

  words.forEach((word) => {
    const like = { [Op.like]: `%${escapeLike(word)}%` };
    and.push({
      [Op.or]: [{ name: like }, { number: like }, { department: like }, { description: like }, { semesters: like }],
    });
  });

  if (departments.length > 0) {
    and.push({ department: departments });
  }

  if (frequencies.length > 0) {
    and.push({ frequency: frequencies });
  }

  if (semesters.length) {
    const { fn, col, where } = db.sequelize;
    and.push({ [Op.or]: semesters.map((s) => where(fn("FIND_IN_SET", s, col("semesters")), { [Op.gt]: 0 })) });
  }

  const { rows, count } = await db.course.findAndCountAll({
    where: { [Op.and]: and },
    order: [
      [sortField, sortParam.startsWith("-") ? "DESC" : "ASC"],
      ["id", "ASC"],
    ],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return res.send({ items: rows, total: count, page, pageSize, pageCount: Math.ceil(count / pageSize) });
};

exports.findOne = async (req, res) => {
  const courseId = req.ids.id;

  const course = await db.course.findByPk(courseId);
  if (!course) {
    throw notFound("course", courseId);
  }

  return res.send(course);
};

exports.create = async (req, res) => {
  const course = await db.course.create(req.valid.body);
  return res.status(201).send(course);
};

exports.update = async (req, res) => {
  const courseId = req.ids.id;

  const course = await db.course.findByPk(courseId);
  if (!course) {
    throw notFound("course", courseId);
  }

  await course.update(req.valid.body);
  return res.send(course);
};

exports.remove = async (req, res) => {
  const courseId = req.ids.id;

  const existing = await db.course.findByPk(courseId);
  if (!existing) {
    throw notFound("course", courseId);
  }

  await db.course.destroy({ where: { id: courseId } });

  return res.status(200).send({ message: "course deleted successfully." });
};

export default exports;
