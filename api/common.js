var conf=require("./conf");
var db = require('./db');

exports.checkParams = (req, params) => { //{{{
  for(var i=0;i<params.length;i++){
    if( !(params[i] in req.query) && !(params[i] in req.body)){
      return false;
    }
  }
  return true;
}//}}}

exports.checkBot = req =>{ //{{{
  if(
    this.checkParams(req, ["bot_token"]) &&(
      req.query.bot_token == conf.botToken ||
      req.body.bot_token == conf.botToken
    )
  ){
    return true;
  }else{
    console.error("bad bot token");
    return false;
  }
} //}}}

exports.checkAdmin = req =>{ //{{{
  if(
    this.checkParams(req, ["admin_token"]) &&(
      req.query.admin_token == conf.adminToken ||
      req.body.admin_token == conf.adminToken
    )
  ){
    return true;
  }else{
    console.error("bad admin token");
    return false;
  }
} //}}}

exports.randStr = num => require('crypto').randomBytes(num).toString('hex');
exports.nowSec = () => Math.floor(new Date().getTime()/1000);

exports.lawyersSessionCheck = (session, cb) =>{ //{{{
  db.pool.query(
    "select * from lawyer_sessions where id  = ? AND limit_time > ?",
    [session, this.nowSec()],
    (e,r,f) =>{
      if(e){
        cb(e,null);
      }else if(r.length != 1){
        cb("not found", null);
        console.log(session);
      }else{
        cb(null, r[0].lawyer_id);
      }
    }
  );
}//}}}

exports.inArray = (value, arry) => arry.indexOf(value)==-1 ?false :true;
