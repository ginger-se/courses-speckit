import db from "../models/index.js";
const Section = db.section;
const Op = db.Sequelize.Op;

const exports = {};
// Create and Save a section
exports.create = async (req, res) => {
  // Validate request
  if (req.body.sectionNumber === undefined) {
    return res.status(400).send({
      message: "Section Number cannot be empty for section!",
    });
  } if (req.body.semesterId === undefined) {
    return res.status(400).send({
      message: "semesterId cannot be empty for section!",
    });
  } if (req.body.courseId === undefined) {
    return res.status(400).send({
      message: "courseId cannot be empty for section!",
    });
  } if (req.body.semesterId === undefined) {
    return res.status(400).send({
      message: "semesterId cannot be empty for section!",
    });
  } if (req.body.facultyFacultyId === undefined) {
    return res.status(400).send({
      message: "facultyId cannot be empty for section!",
    });
  }

  // Create a section
  const section = {
    sectionNumber: req.body.sectionNumber,
    semesterId: req.body.semesterId,
    courseId: req.body.courseId,
    facultyFacultyId: req.body.facultyFacultyId,
    daysOfWeek: req.body?.daysOfWeek,
    startTime: req.body?.startTime,
    endTime: req.body?.endTime,
  };

  try {
    const data = await Section.create(section);
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the section.",
    });
  }
};

// Retrieve all sectiones
exports.findAll = async (req, res) => {
  try {
    const data = await Section.findAll();
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving sections.",
    });
  }
};
// Retrieve all sectiones for a project
exports.findAllForCourse = async (req, res) => {
  const courseId = req.params.id;
  try {
    const data = await Section.findAll({
      where: {
        courseId: courseId
      },
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving sections.",
    });
  }
};

// Find a single section with an id
exports.findOne = async (req, res) => {
  const id = req.params.id;

  try {
    const data = await Section.findByPk(id);
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error retrieving section with id=" + id,
    });
  }
};

// Update a section by the id in the request
exports.update = async (req, res) => {
  const id = req.params.id;
  const status = await Section.findByPk(id);

  try {
    const num = await Section.update(req.body, {
      where: { id: id },
    });
    if (num == 1) {

      res.send({
        message: "section was updated successfully.",
      });
    } else {
      res.send({
        message: `Cannot update section with id=${id}. Maybe section was not found or req.body is empty!`,
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error updating section with id=" + id,
    });
  }
};

// Delete a section with the specified id in the request
exports.delete = async (req, res) => {
  const id = req.params.id;

  try {
    const sectionId = id
    if (sectionId === null) {
      return res.status(400).send({ message: "Invalid section id." });
    }

    const existing = await db.section.findByPk(sectionId);
    if (!existing) {
      return res.status(404).send({
        message: `Section with id=${sectionId} not found.`,
      });
    }

    await db.section.destroy({ where: { id: sectionId } });

    return res.status(200).send({ message: "section deleted successfully." });
  } catch (err) {
    return res.status(500).send({ message: "Failed to delete section." });
  }
};

// Delete all sectiones from the database.
exports.deleteAll = async (req, res) => {
  try {
    const number = await Section.destroy({
      where: {},
      truncate: false,
    });
    res.send({ message: `${number} sections were deleted successfully!` });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while removing all sections.",
    });
  }
};

export default exports;