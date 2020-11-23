const redis = require('redis');
const config = require('./config.json').redis;
const redisKey = require('./redisKey');
const log = require('./log4jsUtil');
const redisUtil = {};
const client = redis.createClient(config.port, config.host, {auth_pass: config.password});

client.on('error',function (err) {
    log.error('redis error：'+err);
});
client.on('connect',function () {
    // log.info('redis连接成功...')
});
client.select(config.database,function (err) {
    if (err){
        log.error('redis set 选库失败：'+err);
    }
});

redisUtil.quit = function() {
    client.quit();
};

redisUtil.get = async function(key) {
    key = redisKey.BASE + key;
    let ret = await new Promise((resolve) => {
        client.get(key, function (err, res) {
            return resolve(res);
        });
    });
    return ret;
};

redisUtil.setex = async function(key, value, expire) {
    key = redisKey.BASE + key;
    let ret = await new Promise((resolve) => {
        client.set(key, value, 'EX', expire, function (err, res) {
            return resolve(res);
        });
    });
    return ret == 'OK';
};

redisUtil.setnx = async function(key, value, expire) {
    key = redisKey.BASE + key;
    let ret = await new Promise((resolve) => {
        client.set(key, value, 'NX', 'EX', expire, function (err, res) {
            return resolve(res);
        });
    });
    return ret == 'OK';
};

redisUtil.sadd = async function(key, value) {
    key = redisKey.BASE + key;
    let ret = await new Promise((resolve) => {
        client.sadd(key, value, function (err, res) {
            return resolve(res);
        });
    });
    return ret;
};

redisUtil.srem = async function(key, value) {
    key = redisKey.BASE + key;
    let ret = await new Promise((resolve) => {
        client.srem(key, value, function (err, res) {
            return resolve(res);
        });
    });
    return ret;
};

redisUtil.smembers = async function(key) {
    key = redisKey.BASE + key;
    let ret = await new Promise((resolve) => {
        client.smembers(key, function (err, res) {
            return resolve(res);
        });
    });
    return ret;
};

redisUtil.sismember = async function(key, value) {
    key = redisKey.BASE + key;
    let ret = await new Promise((resolve) => {
        client.sismember(key, value, function (err, res) {
            return resolve(res);
        });
    });
    return ret;
};

redisUtil.expire = async function(key, expire) {
    key = redisKey.BASE + key;
    let ret = await new Promise((resolve) => {
        client.expire(key, expire, function (err, res) {
            return resolve(res);
        });
    });
    return ret == 1;
};

module.exports = redisUtil;