import db from "../models/index.js";
import logger from "../config/logger.js";
import { parseToNumber, requiredText, requiredInt } from "../helpers/fields.js";
import { Op } from "sequelize";
import { DEPARTMENTS, FREQUENCIES, SEMESTERS, COURSE_NUMBER_REGEX } from "../helpers/constants.js";

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
  try {
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
      return res.status(400).send({ message: `Department must be one of ${DEPARTMENTS.join(", ")}.` });
    }

    if (!semesters.every((s) => SEMESTERS.includes(s))) {
      return res.status(400).send({ message: `Semester must be one or more of ${SEMESTERS.join(", ")}.` });
    }

    if (!frequencies.every((f) => FREQUENCIES.includes(f))) {
      return res.status(400).send({ message: `Frequency must be one of ${FREQUENCIES.join(", ")}.` });
    }

    if (!SORTABLE.includes(sortField)) {
      return res.status(400).send({ message: `Sort must be one of ${SORTABLE.join(", ")}.` });
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
  } catch (err) {
    logger.error(`course findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch courses." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const courseId = parseToNumber(req.params.id);
    if (courseId === null) {
      return res.status(400).send({ message: "Invalid course id." });
    }

    const course = await db.course.findByPk(courseId);
    if (!course) {
      return res.status(404).send({ message: `Course with id=${courseId} not found.` });
    }

    return res.send(course);
  } catch (err) {
    logger.error(`Course findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch course." });
  }
};

exports.create = async (req, res) => {
  try {
    const name = requiredText(req.body.name);
    const number = requiredText(req.body.number);
    const description = requiredText(req.body.description);
    const semesters = req.body.semesters;
    const frequency = requiredText(req.body.frequency);
    const hours = requiredInt(req.body.hours);
    const department = requiredText(req.body.department);

    if (!name || !number || !description || !semesters || !frequency || !hours || !department) {
      return res.status(400).send({ message: "Required" });
    }

    if (name.length > 255) {
      return res.status(400).send({
        message: "Course name cannot be longer than 255 characters.",
      });
    }

    if (!COURSE_NUMBER_REGEX.test(number)) {
      return res.status(400).send({
        message: "Number must be one in the form XXXX-#### (ex. COMP-1234)",
      });
    }

    if (!DEPARTMENTS.includes(department)) {
      return res.status(400).send({
        message: `Department must be one of ${DEPARTMENTS.join(", ")}.`,
      });
    }

    if (!FREQUENCIES.includes(frequency)) {
      return res.status(400).send({
        message: `Frequency must be one of ${FREQUENCIES.join(", ")}.`,
      });
    }

    if (!semesters.every((semester) => SEMESTERS.includes(semester))) {
      return res.status(400).send({
        message: `Semester must be one or more of ${SEMESTERS.join(", ")}.`,
      });
    }

    const existing = await db.course.findOne({
      where: { number },
    });
    if (existing) {
      return res.status(400).send({ message: "Course number is already taken." });
    }

    const course = await db.course.create({
      name,
      number,
      description,
      semesters,
      frequency,
      hours,
      department,
    });

    return res.status(201).send(course);
  } catch (err) {
    logger.error(`course create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create course." });
  }
};

exports.update = async (req, res) => {
  try {
    const courseId = parseToNumber(req.params.id ?? req.body.id);
    const name = requiredText(req.body.name);
    const number = requiredText(req.body.number);
    const description = requiredText(req.body.description);
    const semesters = req.body.semesters;
    const frequency = requiredText(req.body.frequency);
    const hours = requiredInt(req.body.hours);
    const department = requiredText(req.body.department);

    if (courseId === null) {
      return res.status(400).send({ message: "Invalid course id." });
    }

    const existing = await db.course.findByPk(courseId);
    if (!existing) {
      return res.status(404).send({
        message: `Course with id=${courseId} not found.`,
      });
    }

    if (!name || !number || !description || !semesters || !frequency || !hours || !department) {
      return res.status(400).send({ message: "Required" });
    }

    if (!COURSE_NUMBER_REGEX.test(number)) {
      return res.status(400).send({
        message: "Number must be one in the form XXXX-#### (ex. COMP-1234)",
      });
    }

    if (!DEPARTMENTS.includes(department)) {
      return res.status(400).send({
        message: `Department must be one of ${DEPARTMENTS.join(", ")}.`,
      });
    }

    if (!FREQUENCIES.includes(frequency)) {
      return res.status(400).send({
        message: `Frequency must be one of ${FREQUENCIES.join(", ")}.`,
      });
    }

    if (!semesters.every((semester) => SEMESTERS.includes(semester))) {
      return res.status(400).send({
        message: `Semester must be one or more of ${SEMESTERS.join(", ")}.`,
      });
    }

    const duplicate = await db.course.findOne({
      where: { number },
    });
    if (duplicate && duplicate.id !== courseId) {
      return res.status(400).send({ message: "Course number is already taken." });
    }

    existing.update(
      {
        name,
        number,
        description,
        semesters,
        frequency,
        hours,
        department,
      },
      { where: { id: courseId } },
    );

    return res.status(200).send(existing);
  } catch (err) {
    logger.error(`course update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update course." });
  }
};

exports.remove = async (req, res) => {
  try {
    const courseId = parseToNumber(req.params.id);
    if (courseId === null) {
      return res.status(400).send({ message: "Invalid course id." });
    }

    const existing = await db.course.findByPk(courseId);
    if (!existing) {
      return res.status(404).send({
        message: `Course with id=${courseId} not found.`,
      });
    }

    await db.course.destroy({ where: { id: courseId } });

    return res.status(200).send({ message: "course deleted successfully." });
  } catch (err) {
    logger.error(`course delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete course." });
  }
};

export default exports;
