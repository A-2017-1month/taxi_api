var express = require('express');
var db = require('../db');
var router = express.Router();
var common = require('../common');
var async = require('async');

router.get('/:id', function(req, res, next) {
  async.waterfall(
    [
      cb =>{
        db.pool.query(
          "select * from users where id = ?",
          [req.params.id],
          (e,r,f) =>{
            if(e){
              console.error(e);
              res.status(500).json({
                error:"database error"
              });
              cb(e);
              return;
            }else if(r.length!=1){
              res.status(404).json({
                error:"user_id not found"
              });
              cb("not found");
              return;
            }
            cb(null,r)
          }
        );
      },
      (r ,cb) =>{
        let todo=[];
        let users = [];
        for(let i=0;i<r.length;i++){
          let user=r[i];
          todo.push(cb=>{
            db.pool.query(
              "select * from user_infomation where `user_id` = ?",
              [user.id],
              (e,r,f) =>{
                if(e){
                  console.error(e);
                  cb(e);
                  return;
                }
                let info={};
                for(let i=0;i<r.length;i++){
                  info[r[i].key]={
                    "value": r[i].value,
                    "date": common.nowSec()
                  }
                }
                users.push({
                  "id": user.id,
                  "chat_tool": user.chat_tool,
                  "infomation": info
                })
                cb(null);
              }
            );
          });
        }
        async.parallel(todo, e =>{
          if(e){
            console.error(e);
            res.status(500).json({
              "error":"database error"
            })
          }else{
            cb(null,users);
          }
        });
      },
      (users,cb) =>{
        res.json({
          error:null,
          data:users[0]
        });
      }
    ]
  );
})

router.post('/', function(req, res, next) {
  if(!common.checkBot(req)){
    res.status(403).json({
      error: "forbiden"
    });
    return;
  }
  if(!common.checkParams(req, ["user_id", "chat_tool"])){
    res.status(400).json({
      error: "set user_id and chat_tool"
    });
    return;
  }
  db.pool.query(
    "insert into users set ?",
    {
      "id": req.body.user_id,
      "chat_tool": req.body.chat_tool,
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
});

router.put('/:id/', function(req, res, next) {
  if(!common.checkBot(req)){
    res.status(403).json({
      error: "bad botToken"
    });
    return;
  }
  if(!common.checkParams(req, ["key", "value"])){
    res.status(400).json({
      error: "set params key and value"
    });
    return;
  }
  db.pool.query(
    "insert into user_infomation(`user_id` ,`key` ,`value`, `date`) "+
    "  values (?,?,?,?) "+
    "  ON DUPLICATE KEY UPDATE `user_id` = ?, `key` = ?, `value` = ?, `date` = ?;" ,
    [
      req.params.id,
      req.body.key,
      req.body.value,
      common.nowSec(),
      req.params.id,
      req.body.key,
      req.body.value,
      common.nowSec()
    ],
    (e, r, f) => {
      if(e){
        console.error(e);
        res.status(500).json({
          error: "database error"
        });
      }else{
        res.json({
          error: null
        })
      }
    }
  );
});

router.delete('/:id/', function(req, res, next) {
  res.send('respond with a resource');
});
module.exports = router;
