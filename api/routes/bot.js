var express = require('express');
var db = require('../db');
var router = express.Router();
var common = require('../common');
var bot = require('../bot');

router.post('/', function(req, res, next) {
  console.log(req.body);
  let eventObj = req.body.events[0];    
  if(eventObj.type === 'message'){
    bot.anaMessage( eventObj.message.text, eventObj.source.userId )
  }
  res.send('su');
})

module.exports = router;
