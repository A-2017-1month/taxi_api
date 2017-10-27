var express = require('express');
var db = require('../db');
var conf = require('../conf');
var router = express.Router();
var common = require('../common');
var async = require('async');
var request = require('request');

var waitList ={};

router.post('/match/:id', function(req, res, next) {
  async.waterfall(
    [
      cb =>{
        db.pool.query(
          "select tasks.*, users.gender, users.different_ok from tasks, users where tasks.id = ? AND tasks.user_id = users.id",
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
                error: "not found"
              });
              cb(404);
            }else{
              cb(null, r[0]);
            }

          }
        );
      },
      (task, cb)=>{
        db.pool.query(
          "select tasks.*, users.id as user_id, users.name, users.gender, users.account_name, users.comment from tasks, users where tasks.id <> ? AND tasks.station_id = ? AND users.id = tasks.user_id AND (users.gender = ?"+
          (task.different_ok==1 ?" OR users.different_ok = 1) " :") ")+
          "AND NOT EXISTS(select * from `match` where task1_id=tasks.id OR task2_id=tasks.id)",
          [task.id, task.station_id, task.gender],
          (e,r,f) =>{
            if(e){
              res.status(500).json({
                error: "database error"
              });
              console.error(e);
              cb(e);
            }else if(r.length==0){
              res.json({
                error: null,
                data:null
              });
              console.error("cannot", r);
              cb("cannot match");
            }else{
              cb(null, task, r);
            }

          }
        );
      },
      (myTask, tasks, cb)=>{
        let todo = [
          cb =>{
            cb(null, -1, null);
          }
        ];
        for(let i=0;i<tasks.length;i++){
          let task = tasks[i];
          todo.push(
            (min, minTask, cb) =>{
              request.get(
                {
                  json: true,
                  url: "https://maps.googleapis.com/maps/api/distancematrix/json?"+
                    "origins="+encodeURIComponent(myTask.to_lat+", "+myTask.to_lng)+"&"+
                    "destinations="+encodeURIComponent(task.to_lat+", "+task.to_lng)+"&"+
                    "key="+conf.googleKey
                },
                function (error, response, body) {
                  let dist = body.rows[0].elements[0].distance.value;
                  if(min > dist || min == -1){
                    cb(null, dist, task);
                  }else{
                    cb(null, min, minTask);
                  }
                }
              );
            }
          );
        }
        async.waterfall(todo,
          (error, min, minTask)=>{
            minTask.goalDistance = min;
            res.json({
              error: null,
              data: minTask
            })
            db.pool.query(
              "insert into `match`(task1_id, task2_id) values(?,?)",
              [req.params.id, minTask.id],
              (e,r,f)=>{
                if(e)console.error(e);

              }
            );
          }
        );
      }
    ]
  );
})

module.exports = router;
