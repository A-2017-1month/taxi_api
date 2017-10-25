var express = require('express');
var db = require('../db');
var router = express.Router();
var common = require('../common');

router.get('/', function(req, res, next) {
  console.log(req.query);
  res.status(418).json(req.query);
})

module.exports = router;
