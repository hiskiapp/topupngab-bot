var DataTypes = require("sequelize").DataTypes;
var _broadcasts = require("./broadcasts");
var _customers = require("./customers");
var _failed_jobs = require("./failed_jobs");
var _games = require("./games");
var _jobs = require("./jobs");
var _migrations = require("./migrations");
var _password_resets = require("./password_resets");
var _payments = require("./payments");
var _schedules = require("./schedules");
var _settings = require("./settings");
var _transactions = require("./transactions");
var _users = require("./users");

function initModels(sequelize) {
  var broadcasts = _broadcasts(sequelize, DataTypes);
  var customers = _customers(sequelize, DataTypes);
  var failed_jobs = _failed_jobs(sequelize, DataTypes);
  var games = _games(sequelize, DataTypes);
  var jobs = _jobs(sequelize, DataTypes);
  var migrations = _migrations(sequelize, DataTypes);
  var password_resets = _password_resets(sequelize, DataTypes);
  var payments = _payments(sequelize, DataTypes);
  var schedules = _schedules(sequelize, DataTypes);
  var settings = _settings(sequelize, DataTypes);
  var transactions = _transactions(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);

  payments.belongsTo(transactions, { as: "transaction", foreignKey: "transaction_id"});
  transactions.hasMany(payments, { as: "payments", foreignKey: "transaction_id"});

  return {
    broadcasts,
    customers,
    failed_jobs,
    games,
    jobs,
    migrations,
    password_resets,
    payments,
    schedules,
    settings,
    transactions,
    users,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
