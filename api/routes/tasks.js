var express = require('express');
var db = require('../db');
var conf = require('../conf');
var router = express.Router();
var common = require('../common');
var async = require('async');

var waitList ={};

const formatTasks = (r, cb) =>{//{{{
  let todo=[];
  let tasks = [];
  for(let i=0;i<r.length;i++){
    let task=r[i];
    todo.push(cb=>{
      db.pool.query(
        "select * from user_infomation where `user_id` = ?",
        [task.user_id],
        (e,r,f) =>{
          if(e){
            console.error(e);
            cb(e);
            return;
          }
          let info={};
          for(let i=0;i<r.length;i++){
            info[r[i].key] = {
              "value": r[i].value,
              "date": r[i].date
            }
          }
          tasks.push({
            "id": task.id,
            "user_id": task.user_id,
            "lawyer_id": task.lawyer_id,
            "time": task.time,
            "user_infomation": info
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
      cb(null,tasks);
    }
  });
}//}}}

router.get('/request', function(req, res, next){ //{{{
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
          "select tasks.* from tasks, requests"+
          " where tasks.id = requests.task_id AND"+
          " requests.lawyer_id = ? AND tasks.lawyer_id is NULL",
          id,
          (e,r,f)=>{
            if(e){
              console.error(e);
              res.status(500).json({
                error:"database error"
              });
              cb(e);
              return;
            }else{
              cb(null, r);
            }
          }
        );
      },
      formatTasks,
      ( tasks, cb ) =>{
        res.json({
          error: null,
          data: tasks
        });
      }
    ],
    err =>{
      if(err)console.error(err);
    }
  );
}); //}}}

router.get('/', function(req, res, next) { //{{{
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
          "select * from tasks where lawyer_id = ?",
          id,
          (e,r,f) =>{
            if(e){
              console.error(e);
              res.status(500).json({
                error:"database error"
              });
              cb(e);
              return;
            }
            cb(null,r)
          }
        );
      },
      formatTasks,
      (tasks,cb) =>{
        res.json({
          error:null,
          data:tasks
        });
      }
    ],
    (err) =>{
      console.error(err);
    }
  );
})//}}}

router.get('/:id/', function(req, res, next) { //{{{
  async.waterfall(
    [
      cb =>{
        db.pool.query(
          "select * from tasks where id = ?",
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
                error:"tasks_id not found"
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
        let tasks = [];
        for(let i=0;i<r.length;i++){
          let task=r[i];
          todo.push(cb=>{
            db.pool.query(
              "select * from task_infomation where `task_id` = ?",
              [task.id],
              (e,r,f) =>{
                if(e){
                  console.error(e);
                  cb(e);
                  return;
                }
                let info={};
                for(let i=0;i<r.length;i++){
                  info[r[i].key]=r[i].value
                }
                tasks.push({
                  "id": task.id,
                  "user_id": task.user_id,
                  "lawyer_id": task.lawyer_id,
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
            cb(null,tasks);
          }
        });
      },
      (tasks,cb) =>{
        res.json({
          error:null,
          data:tasks[0]
        });
      }
    ]
  );
})//}}}

router.get('/:id/chat/:you(users|lawyers)', function(req, res, next) {//{{{
  let limit = 50;
  let lastId = 0;
  if(req.params.you=="users" && !common.checkBot(req)){
    res.status(403).json({
      error: "forbiden"
    });
    return;
  }
  if(req.params.you=="lawyers" && !common.checkParams(req, ["session"])){
    res.status(403).json({
      error: "forbiden session"
    });
    return;
  }
  if(common.checkParams(req, ["limit"])){
    limit = req.query.limit;
  }
  if(common.checkParams(req, ["last_id"])){
    lastId = req.query.last_id;
  }
  async.waterfall(
    [
      cb =>{
        if(req.params.you=="lawyers"){
          common.lawyersSessionCheck(req.query.session,(err,id)=>{
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
        }else{
          cb(null, null);
        }
      },
      (id, cb) =>{
        db.pool.query(
          "select * from tasks where id = ?",
          req.params.id,
          (e,r,f)=>{
            if(e){
              console.error(e);
              res.status(500).json({
                error:"database error"
              });
              cb(e);
              return;
            }else if(r.length!=1){
              res.status(404).json({
                error:"tasks_id not found"
              });
              cb("not found");
              return;
            }else if(id && r[0].lawyer_id != id){
              res.status(403).json({
                error:"forbiden"
              });
              console.error(r,"ne",id);
              cb(r);
            }else{
              cb(null, r[0]);
            }
          }
        );
      },
      (task, cb) =>{
        db.pool.query(
          "select * from chats where task_id = ? and lawyer_id = ? and id > ?",
          [
            task.id,
            task.lawyer_id,
            lastId
          ],
          (e,r,f) =>{
            if(e){
              console.error(e);
              res.status(500).json({
                error:"database error"
              });
              cb(e);
            }else if(r.length >0 || !common.checkParams(req,["wait"])){
              res.json({
                "error":null,
                "data":r
              });
              cb(null, null, task);
            }else{
              let waitId = common.randStr(16);
              if(!(task.id in waitList)){
                waitList[task.id]={};
              }
              waitList[task.id][waitId] = ()=>cb(null, true, task);
              setTimeout(
                () =>{
                  if(waitId in waitList[task.id]){
                    delete waitList[task.id][waitId];
                    cb(null, true, task);
                  }
                },
                conf.waitTime*1000
              );
            }
          }
        );
      },
      (wait, task, cb)=>{
        if(wait){
          db.pool.query(
            "select * from chats where task_id = ? and lawyer_id = ? and id > ?",
            [
              task.id,
              task.lawyer_id,
              lastId
            ],
            (e,r,f) =>{
              if(e){
                console.error(e);
                res.status(500).json({
                  error:"database error"
                });
                cb(e);
              }else{
                res.json({
                  "error":null,
                  "data":r
                });
                cb(null, null, task);
              }
            }
          );
        }else{
          cb(null)
        }
      }
    ],
    err =>{
      if(err)console.error(err);
    }
  );
});//}}}

router.post('/', function(req, res, next) { //{{{
  if(!common.checkBot(req)){
    res.status(403).json({
      error: "forbiden"
    });
    return;
  }
  if(!common.checkParams(req, ["user_id"])){
    res.status(400).json({
      error: "set user_id"
    });
    return;
  }
  async.waterfall(
    [
      cb =>{
        db.pool.query(
          "select * from users where `id` = ?",
          [req.body.user_id],
          (e,r,f) =>{
            if(e){
              console.error(e);
              res.status(500).json({
                error:"database error"
              });
              cb(e);
              return;
            }
            if(r.length != 1){
              console.error(r);
              res.status(404).json({
                error: "user_id not found"
              });
              cb("user_id not found");
              return;
            }
            cb(null);
          }
        );
      },
      cb =>{
        db.pool.query(
          "insert into tasks set ?",
          {
            "user_id": req.body.user_id,
            "time": common.nowSec()
          },
          (e,r,f) =>{
            if(e){
              console.error(e);
              res.status(500).json({
                error:"database error"
              });
              cb(e);
              return;
            }
            console.log("insert", r.insertId);
            cb(null, r.insertId);
          }
        );
      },
      (taskId, cb) =>{
        res.json({
          error:null,
          data: {
            id: taskId
          }
        });
        cb(null);
      }
    ],
    err =>{
      if(err){
        console.error(err);
      }
    }
  );
}); //}}}

router.post('/:id/request/', function(req, res, next){ //{{{
  if(!common.checkBot(req)){
    res.status(403).json({
      error: "forbiden"
    });
    return;
  }
  if(!common.checkParams(req, ["lawyer_id"])){
    res.status(400).json({
      error: "set lawyer_id"
    });
    return;
  }
  async.waterfall(
    [
      cb =>{
        db.pool.query(
          "select * from lawyers where lawyers_number=?",
          req.body.lawyer_id,
          (e,r,f) =>{
            if(e){
              res.status(500).json({
                error: "database error"
              });
              console.error(e);
              cb(e);
            }else if(r.length!=1){
              res.status(404).json({
                error:"lawyer_id not found"
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
          "insert into requests set ?",
          {
            "task_id": req.params.id,
            "lawyer_id": req.body.lawyer_id
          },
          (e,r,f) =>{
            if(e){
              res.status(500).json({
                error: "database error"
              });
              console.error(e);
              cb(e);
            }else{
              res.json({
                error:null
              });
            }
          }
        );
      }
    ]
  );
});//}}}

router.post('/:id/chat/:you(users|lawyers)', function(req, res, next) { //{{{
  if(req.params.you=="users" && !common.checkBot(req)){
    res.status(403).json({
      error: "forbiden"
    });
    return;
  }
  if(req.params.you=="lawyers" && !common.checkParams(req, ["session"])){
    res.status(403).json({
      error: "forbiden session"
    });
    return;
  }
  if(!common.checkParams(req, ["message"])){
    res.status(400).json({
      error: "set message"
    });
    return;
  }
  async.waterfall(
    [
      cb =>{
        if(req.params.you=="lawyers"){
          common.lawyersSessionCheck( req.body.session, (err,id)=>{
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
        }else{
          cb(null, null);
        }
      },
      (id, cb) =>{
        db.pool.query(
          "select * from tasks where id = ?",
          req.params.id,
          (e,r,f)=>{
            if(e){
              console.error(e);
              res.status(500).json({
                error:"database error"
              });
              cb(e);
              return;
            }else if(r.length!=1){
              res.status(404).json({
                error:"tasks_id not found"
              });
              cb("not found");
              return;
            }else if(id && r[0].lawyer_id != id){
              res.status(403).json({
                error:"forbiden"
              });
              console.error(r,"ne",id);
              cb(r);
            }else{
              cb(null, r[0]);
            }
          }
        );
      },
      (task, cb) =>{
        db.pool.query(
          "insert into chats set ?",
          {
            "task_id": task.id,
            "lawyer_id": task.lawyer_id,
            "direction": req.params.you=="lawyers"?1:0,
            "message": req.body.message,
            "time": common.nowSec()
          },
          (e,r,f) =>{
            if(e){
              console.error(e);
              res.status(500).json({
                error:"database error"
              });
              cb(e);
              return;
            }else{
              res.json({
                "error":null
              });
              let todo = waitList[task.id];
              delete waitList[task.id];
              for(let waitId in todo){
                todo[waitId]();
              }
              cb(null);
            }
          }
        );
      }
    ],
    err =>{
      if(err)console.error(err);
    }
  );
}); //}}}

router.put('/:id/accept/', function(req, res, next) {//{{{
  async.waterfall(
    [
      cb =>{
        common.lawyersSessionCheck( req.body.session, (err,id)=>{
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
          "select tasks.* from tasks, requests"+
          " where tasks.id=? AND tasks.lawyer_id is NULL AND requests.task_id = tasks.id AND requests.lawyer_id = ?",
          [req.params.id, id],
          (e,r,f) =>{
            if(e){
              res.status(500).json({
                error: "database error"
              });
              console.error(e);
              cb(e);
            }else if(r.length!=1){
              res.status(404).json({
                error:"task not found"
              });
              cb("not found");
            }else{
              cb(null,id);
            }
          }
        );
      },
      (id, cb) =>{
        db.pool.query(
          "update tasks set lawyer_id=? where id=?",
          [id, req.params.id],
          (e,r,f) =>{
            if(e){
              res.status(500).json({
                error: "database error"
              });
              console.error(e);
              cb(e);
            }else{
              res.json({
                error: null
              })
              cb(null);
            }
          }
        );
      }
    ]
  );
});//}}}

router.put('/:id/', function(req, res, next) {//{{{
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
  if(req.body.key == "lawyer_id"){
    async.waterfall(
      [
        cb =>{
          db.pool.query(
            "select * from lawyers where lawyers_number=?",
            req.body.value,
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
            "update tasks set lawyer_id=? where id=?",
            [req.body.value,req.params.id],
            (e,r,f) =>{
              if(e){
                res.status(500).json({
                  error: "database error"
                });
                console.error(e);
                cb(e);
              }else{
                res.json({
                  error: null
                })
                cb(null);
              }
            }
          );
        }
      ]
    );
    return;
  }
  db.pool.query(
    "insert into task_infomation(`task_id` ,`key` ,`value`) "+
    "  values (?,?,?) "+
    "  ON DUPLICATE KEY UPDATE `task_id` = ?, `key` = ?, `value` = ?;" ,
    [
      req.params.id,
      req.body.key,
      req.body.value,
      req.params.id,
      req.body.key,
      req.body.value,
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
});//}}}

router.delete('/:id/', function(req, res, next) {
  res.send('respond with a resource');
});
module.exports = router;
