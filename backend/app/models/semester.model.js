export default (sequelize, Sequelize) => {
  const Semester = sequelize.define("semester", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  });

  return Semester;
};
