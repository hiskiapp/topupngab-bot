const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('jobs', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    queue: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    payload: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    attempts: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false
    },
    reserved_at: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    available_at: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    created_at: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'jobs',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "jobs_queue_index",
        using: "BTREE",
        fields: [
          { name: "queue" },
        ]
      },
    ]
  });
};
