var express = require('express');
var db = require('../db');
var router = express.Router();
var common = require('../common');
var sha256 = require('sha256');
var async = require('async');

router.get('/', function(req, res, next) { //{{{
  if(!common.checkBot(req)){
    res.status(403).json({
      error: "bad botToken"
    });
    return;
  }
  db.pool.query(
    "select * from lawyers",
    (e,r,f) =>{
      if(e){
        res.status(500).json({
          error: "database error"
        });
        console.error(e);
        return;
      }else{
        r.map(
          v =>{
            delete v.pass;
            return v;
          }
        );
        res.json({
          error: null,
          data: r
        });
      }
    }
  );
}); //}}}

router.get('/me/', function(req, res, next) { //{{{
  async.waterfall(
    [
      cb =>{
        common.lawyersSessionCheck( req.query.session, (err,id)=>{
          if(err && err=="not found"){
            res.status(403).json({
              "error":"wrong session"
            });
            cb(err);
          }else if(err){
            res.status(500).json({
              "error": "database error"
            });
            cb(err);
          }else{
            cb(null, id);
          }
        });
      },
      (id, cb) =>{
        db.pool.query(
          "select * from lawyers where lawyers_number=?",
          [id],
          (e,r,f) =>{
            if(e){
              res.status(500).json({
                error: "database error"
              });
              cb(e);
              return;
            }else{
              r.map(
                v =>{
                  delete v.pass;
                  return v;
                }
              );
              res.json({
                error: null,
                data: r[0]
              });
            }
          }
        );
      }
    ],
    err =>{
      if(err){
        console.error(err);
      }
    }
  );
}); //}}}

router.get('/:id/', function(req, res, next) { //{{{
  if(!common.checkBot(req)){
    res.status(403).json({
      error: "bad botToken"
    });
    return;
  }
  db.pool.query(
    "select * from lawyers where lawyers_number=?",
    [req.params.id],
    (e,r,f) =>{
      if(e){
        res.status(500).json({
          error: "database error"
        });
        console.error(e);
        return;
      }else{
        r.map(
          v =>{
            delete v.pass;
            return v;
          }
        );
        res.json({
          error: null,
          data: r
        });
      }
    }
  );
}); //}}}

router.post('/', function(req, res, next) {//{{{
  if(!common.checkAdmin(req)){
    res.status(403).json({
      error: "forbiden"
    });
    return;
  }
  if(
    !common.checkParams(req, ["email", "pass", "name", "lawyers_number"]) ||
    isNaN(req.body.lawyers_number)
  ){
    res.status(400).json({
      error: "set email, pass, name and lawyers_number"
    });
    return;
  }
  var passHash = sha256(req.body.lawyers_number+req.body.pass+"techlattesalt");
  db.pool.query(
    "insert into lawyers set ?",
    {
      "email" : req.body.email,
      "pass" : passHash,
      "name" : req.body.name,
      "lawyers_number" : req.body.lawyers_number*1,
      "talk_limit" : "talk_limit" in req.body ?req.body.talk_limit :100
    },
    (e,r,f) =>{
      if(e){
        res.status(500).json({
          error: "database error"
        });
        console.error(e);
        return;
      }else{
        res.json({
          error: null
        });
      }
    }
  );
});//}}}

router.put('/:id/', function(req, res, next) { //{{{ TODO:DBG
  if(!common.checkAdmin(req)){
    res.status(403).json({
      error: "forbiden"
    });
    return;
  }
  if(common.checkParams(req, ["key", "value"])){
    res.status(400).json({
      error: "set params key and value"
    });
    return;
  }
  if(req.body.key in ["lawyers_number"]){
    res.status(400).json({
      error: "lawyers_number cannot change"
    });
    return;
  }else if(req.body.key in ["email", "pass", "name"]){
    async.waterfall(
      [
        cb =>{
          db.pool.query(
            "select * from lawyers where lawyers_number=?",
            req.params.id,
            (e,r,f) =>{
              if(e){
                res.status(500).json({
                  error: "database error"
                });
                console.error(e);
                cb(e);
              }else if(r.length!=1){
                res.status(404).json({
                  error:"lawyers_number not found"
                });
                cb("not found");
              }else{
                cb(null)
              }
            }
          );
        },
        cb =>{
          db.pool.query(
            "update lawyers set ?? = ? where lawyers_number=?",
            [req.body.key, req.body.value, req.params.id],
            (e,r,f) =>{
              if(e){
                res.status(500).json({
                  error: "database error"
                });
                console.error(e);
                cb(e);
              }else{
                cb(null)
              }
            }
          );
        }
      ],
      err =>{
        if(!err){
          res.json({
            "error":null
          });
        }else{
          console.error(err);
        }
      }
    );   
    return;
  }else{
    res.json({});
  }
  var passHash = sha256(req.body.email+req.body.pass+"techlattesalt");
});//}}}

router.post('/:id/login/', function(req, res, next) {//{{{
  if(!common.checkParams(req, ["pass"])){
    res.status(400).json({
      error: "set params pass"
    });
    return;
  }
  var passHash = sha256(req.params.id+req.body.pass+"techlattesalt");
  async.waterfall(
    [
      cb =>{
        db.pool.query(
          "select * from lawyers where lawyers_number = ? and pass =?",
          [req.params.id, passHash],
          (e,r,f) =>{
            if(e){
              res.status(500).json({
                error: "database error"
              });
              console.error(e);
              cb(e);
            }else if(r.length != 1){
              res.status(403).json({
                error: "wrong lawyers number or pass"
              });
              cb("wrong pass or id");
            }else{
              cb(null);
            }
          }
        );
      },
      cb =>{
        var sessionId = common.randStr(32);
        db.pool.query(
          "insert into lawyer_sessions set ?",
          {
            "id": sessionId,
            "lawyer_id": req.params.id,
            "limit_time": common.nowSec() + 2*24*60*60
          },
          (e,r,f) =>{
            if(e){
              res.status(500).json({
                error: "database error"
              });
              console.error(e);
              cb(e);
            }else{
              cb(null,sessionId);
            }
          }
        );
      }
    ],
    (err, sessionId) => {
      if(err){
        console.error(err);
      }else{
        res.json({
          "error":null,
          "data":{
            "session": sessionId
          }
        });
      }
    }
  );
});//}}}

router.delete('/', function(req, res, next) {
  res.send('respond with a resource');
}); 
module.exports = router;
