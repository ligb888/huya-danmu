const client = require('./client');
const log = require('../util/log4jsUtil');

class sendClient extends client{

    constructor(platform_id, room_id, nickname, ck) {
        super();
        this.platform_id = platform_id;
        this.room_id = room_id;
        this.clientName = "发送线程";
        this.nickname = nickname;
        this.cookies = ck;
        this.url = 'wss://cdnws.api.huya.com';
        log.info(this.getInfo()+"开始登陆");
        this.start().then(() => {
            // log.info(this.getInfo()+"创建成功");
        }, err => {
            log.error(this.getInfo()+"异常退出", err);
            this.exit();
        });
    }
}
module.exports = sendClient;