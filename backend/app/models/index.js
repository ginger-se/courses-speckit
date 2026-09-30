import { Sequelize } from "sequelize";
import sequelize from "../config/sequelizeInstance.js";
import userModel from "./user.model.js";
import sessionModel from "./session.model.js";
import courseModel from "./course.model.js";

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Register models and associations here as features define them, e.g.:
db.user = userModel(sequelize, Sequelize);
db.session = sessionModel(sequelize, Sequelize);
db.course = courseModel(sequelize, Sequelize);

db.user.hasMany(db.session, {
  foreignKey: "userId",
  as: "sessions",
  onDelete: "CASCADE",
});

db.session.belongsTo(db.user, {
  foreignKey: "userId",
  as: "user",
});

export default db;
