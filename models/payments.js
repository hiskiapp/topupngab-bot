const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('payments', {
    id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      primaryKey: true
    },
    transaction_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'transactions',
        key: 'id'
      }
    },
    payment: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    reference: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "payments_reference_unique"
    },
    amount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    amount_received: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    approval_status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    approval_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'payments',
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
        name: "payments_reference_unique",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "reference" },
        ]
      },
      {
        name: "payments_transaction_id_foreign",
        using: "BTREE",
        fields: [
          { name: "transaction_id" },
        ]
      },
    ]
  });
};
