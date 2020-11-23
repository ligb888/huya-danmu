const mysql = require('mysql');
const config = require('./config.json').mysql;
const log = require('./log4jsUtil');
const mysqlUtil = {};
const connection = mysql.createConnection({
    host     : config.host,
    user     : config.user,
    password : config.password,
    database : config.database,
    timezone : "SYSTEM"
});
connection.connect(function(){
    // log.info("mysql连接成功...")
});


mysqlUtil.end = function () {
    connection.end();
};

mysqlUtil.query = async function (sql) {
    let ret = await new Promise((resolve) => {
        connection.query(sql, function (error, res) {
            if(error){
                log.error("查询出错;sql="+sql+";error="+error)
                throw error;
            }
            return resolve(res);
        });
    });
    return ret;
};

module.exports = mysqlUtil;
