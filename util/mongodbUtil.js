const mongodb = require('mongodb');
const config = require('./config.json').mongodb;
const log = require('./log4jsUtil');
const mongodbUtil = {};
let dbo = null;

mongodbUtil.getDbo = async function(){
    if(dbo == null){
        dbo = await new Promise((resolve) => {
            mongodb.MongoClient.connect(config.url, {useNewUrlParser: true,useUnifiedTopology: true}, function (err, d) {
                if (err) throw err;
                // log.info("mongodb连接成功...");
                return resolve(d.db(config.dbname));
            });
        });
    }
    return dbo;
};

mongodbUtil.getCo = async function(co){
    let dbo = await this.getDbo();
    await dbo.createCollection(co);
    return dbo.collection(co);
};

module.exports = mongodbUtil;

