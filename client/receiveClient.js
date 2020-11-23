const client = require('./client');
const log = require('../util/log4jsUtil');

class receiveClient extends client{

    constructor(platform_id, room_id) {
        super();
        this.platform_id = platform_id;
        this.room_id = room_id;
        this.clientName = "接收线程";
        this.url = 'wss://cdnws.api.huya.com';
        this.isLogin = true;
        this.start().then(() => {
            log.info(this.getInfo()+"创建成功");
        }, err => {
            log.info(this.getInfo()+"异常退出", err);
            this.exit();
        });
    }
}
module.exports = receiveClient;