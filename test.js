const sendClient = require("./client/sendClient");
const receiveClient = require("./client/receiveClient");
let receive = new receiveClient("10002", "cxldb");

// 打印接收到的消息
receive.on("message", msg => {
    // msg.type表示消息类型
    // enter：进场消息、chatmsg：弹幕消息、dgb：送礼消息
    console.log(msg);
});


// 发送弹幕和送礼，需要设置cookies
let sender = new sendClient("10002", "cxldb", "测试账号", [{"domain": ".huya.com", "httpOnly": false, "name": "huya_web_rep_cnt", "path": "/", "secure": false, "value": "361"}]);


// 登录成功后进行发送弹幕和送礼
sender.on("loginSuccess", msg => {
    // 发送弹幕
    sender.sendMsg("今天送个什么好呢~");

    // 登录成功1秒后，创建送礼订单
    setTimeout(() => {
        sender.getSequence();
    }, 1000);

    // 送礼订单创建成功时，进行送礼，礼物列表socket服务器会返回
    sender.on("getSequence", msg => {
        sender.consumeGift(msg.sSeq, "20114", 1);
    });
});

