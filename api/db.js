var mysql = require("mysql");
var conf = require("./conf");
var pool  = mysql.createPool({
  connectionLimit : 10,
  host            : conf.dbHost,
  user            : conf.dbUser,
  password        : conf.dbPass,
  database        : conf.dbDatabase
});

exports.pool = pool;
