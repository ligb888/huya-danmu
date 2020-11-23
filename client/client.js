const ws = require('ws');
const md5 = require('md5');
const events = require('events');
const to_arraybuffer = require('to-arraybuffer');
const { Taf, TafMx, HUYA, List } = require('../util/lib');
const log = require('../util/log4jsUtil');
const timeout = 300 * 1000;
const ping_interval = 30 * 1000;
const heartbeat_interval = 60 * 1000;
const fresh_gift_interval = 5 * 60 * 1000;

const request = require('request-promise');
const r = request.defaults({ json: true, gzip: true, timeout: 30 * 1000, headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 6 Build/LYZ28E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Mobile Safari/537.36' } });

class client extends events{
    constructor() {
        super();
        this.isRun = true;
        this.isLogin = false;
        this.url = "";
        this.platform_id = "";
        this.room_id = "";
        this.nickname = "";
        this.clientName = "";
        this.cookies = "";
        this._client = null;
        this._gift_info = {};
        this.startTime = Date.now();
        this._chat_list = new List();
        this.bar_list = new Array();
        this._emitter = new events.EventEmitter()
    }

    exit(){
        this.isRun = false;
        this.isLogin = false;
        if(this._client){
            this._client.close();
        }
    }

    loginSuccess(){
        log.info(this.getInfo()+"登录成功");
    }

    getInfo() {
        let info = this.clientName+";平台="+this.platform_id+";房间="+this.room_id+";";
        if(this.nickname){
            info += "账号="+this.nickname+";";
        }
        return info;
    }

    loginFail(){
        log.info(this.getInfo()+"登录失败");
    }

    async start(){
        if (this._starting) return
        this._starting = true
        this._info = await this._get_chat_info()
        if (!this._info){
            log.info(this.getInfo()+"房间不存在");
            this.emit('close');
            return;
        }
        this._main_user_id = new HUYA.UserId()
        this._main_user_id.lUid = this._info.yyuid
        this._main_user_id.sHuYaUA = "webh5&1.0.0&websocket"
        this._start_ws()
    }

    _start_ws() {
        let self = this;
        this._client = new ws('wss://cdnws.api.huya.com', {
            perMessageDeflate: false,
            handshakeTimeout: timeout
        });
        this._client.on('open', () => {
            if(this.clientName == "接收线程"){
                this._get_gift_list();
                this._get_chat_list();
                this._fresh_gift_list_timer = setInterval(this._get_gift_list.bind(this), fresh_gift_interval)
            }else{
                this._login();
            }
            this.sendPingReq();
            this._ping_timer = setInterval(this.sendPingReq.bind(this), ping_interval)
            this._connect()
        })
        this._client.on('error', err => {
            log.error(this.getInfo()+"房间出错", err)
            // this.emit('error', err)
        })
        this._client.on('close', async () => {
            if(this.isRun){
                log.info(this.getInfo()+"线程非正常关闭");
            }else{
                log.info(this.getInfo()+"线程关闭");
            }
            this.isRun = false;
            this.isLogin = false;
            this._stop();
            this.emit('close');
        })
        this._client.on('message', this._on_mes.bind(this))
        this._emitter.on("8006", msg => {
            const msg_obj = {
                type: 'online',
                time: new Date().getTime(),
                count: msg.iAttendeeCount
            }
            this.emit('message', msg_obj)
        })
        //弹幕
        this._emitter.on("1400", msg => {
            let nl = 0;
            if(msg.vDecorationPrefix && msg.vDecorationPrefix.value){
                for(let item of msg.vDecorationPrefix.value){
                    if(item.iAppId == "10200"){
                        let nobleBase = new HUYA.NobleBase();
                        nobleBase.readFrom(new Taf.JceInputStream(item.vData.buffer));
                        nl = nobleBase.iLevel;
                    }
                }
            }
            let id = md5(JSON.stringify(msg));
            const msg_obj = {
                id: id,
                type: 'chatmsg',
                room_id: self.room_id,
                timestamp: new Date().getTime()+"",
                uid: msg.tUserInfo.lUid+"",
                nn: msg.tUserInfo.sNickName,
                ic: msg.tUserInfo.ic,
                nl: nl,
                txt: msg.sContent
            };
            this.emit('message', msg_obj)
        });
        //送礼
        this._emitter.on("6501", msg => {
            // if (msg.lPresenterUid != this._info.yyuid) return
            let gift = this._gift_info[msg.iItemType + ''];
            if(!gift){
                log.error("不识别的礼物"+JSON.stringify(msg));
                return;
            }
            let nl = 0;
            if(msg.vDecorationPrefix && msg.vDecorationPrefix.value){
                for(let item of msg.vDecorationPrefix.value){
                    if(item.iAppId == "10200"){
                        let nobleBase = new HUYA.NobleBase();
                        nobleBase.readFrom(new Taf.JceInputStream(item.vData.buffer));
                        nl = nobleBase.iLevel;
                    }
                }
            }
            let id = md5(JSON.stringify(msg));
            let msg_obj = {
                id: id,
                type: 'dgb',
                room_id: self.room_id,
                timestamp: new Date().getTime()+"",
                uid: msg.lSenderUid+"",
                nn: msg.sSenderNick,
                ic: msg.iSenderIcon,
                nl: nl,
                gfid: msg.iItemType,
                gfcnt: msg.iItemCount,
                gift_name: gift.name,
                gift_icon: gift.icon,
                price_big: gift.price,
                price_total: msg.iItemCount * gift.price
            };
            this.emit('message', msg_obj)
        });
        //贵族进场
        this._emitter.on("6110", msg => {
            let id = md5(JSON.stringify(msg));
            let msg_obj = {
                id: id,
                type: 'enter',
                room_id: self.room_id,
                timestamp: new Date().getTime()+"",
                uid: msg.lUid+"",
                nn: msg.sNickName,
                ic: msg.sLogoURL,
                nl: msg.tNobleInfo.iNobleLevel,
                nl_name: msg.tNobleInfo.sNobleName
            };
            this.emit('message', msg_obj)
        });
        //贵宾变化
        this._emitter.on("6210", msg => {
            if(msg.iCount === msg.iTotal
                && msg.iCount === msg.vVipBarItem.value.length
                && msg.vVipBarItem.value.length > 0
                && this.bar_list.length > 0
                && this.bar_list.length <= 100){
                //没有分页的贵宾数据，进行对比
                for(let i of msg.vVipBarItem.value){
                    if(i.tNobleInfo.iNobleLevel != 0){
                        continue;
                    }
                    let flag = true;
                    for(let j of this.bar_list){
                        if(i.lUid === j.lUid){
                            flag = false;
                            break;
                        }
                    }
                    if(flag){
                        let id = md5(JSON.stringify(msg));
                        let msg_obj = {
                            id: id,
                            type: 'enter',
                            room_id: self.room_id,
                            timestamp: new Date().getTime()+"",
                            uid: i.lUid+"",
                            nn: i.sNickName,
                            ic: i.sLogo,
                            nl: i.tNobleInfo.iNobleLevel,
                            nl_name: i.tNobleInfo.sNobleName
                        };
                        this.emit('message', msg_obj);
                        break;
                    }
                }
            }
            this.bar_list = msg.vVipBarItem.value;
        });
        this._emitter.on("getPropsList", msg => {
            msg.vPropsItemList.value.forEach(item => {
                let icon = "";
                let name = item.sPropsName;
                try{
                    icon = item.vPropsIdentity.value[0].sPropsWeb.split("&")[0];
                }catch (e) {
                }
                try{
                    name = item.vPropView.value[0].name;
                }catch (e) {
                }
                this._gift_info[item.iPropsId + ''] = {
                    name: item.vPropView.value[0].name,
                    price: item.iPropsYb / 100,
                    icon: icon
                }
            });
        });
        this._emitter.on("sendMessage", msg => {
        });
        this._emitter.on("getSequence", msg => {
            this.emit('getSequence', msg);
        });
        this._emitter.on("consumeGift", msg => {
            log.info(msg)
        });
    }

    _get_gift_list() {
        let prop_req = new HUYA.GetPropsListReq()
        prop_req.tUserId = this._main_user_id
        prop_req.iTemplateType = HUYA.EClientTemplateType.TPL_MIRROR
        this._send_wup("PropsUIServer", "getPropsList", prop_req)
    }

    _get_chat_list() {
        let t;
        (t = new HUYA.WSRegisterGroupReq).vGroupId.value.push("live:" + this._info.yyuid),
            t.vGroupId.value.push("chat:" + this._info.yyuid);
        var e = new Taf.JceOutputStream;
        t.writeTo(e);
        var i = new HUYA.WebSocketCommand;
        i.iCmdType = HUYA.EWebSocketCommandType.EWSCmdC2S_RegisterGroupReq,
            i.vData = e.getBinBuffer(),
            e = new Taf.JceOutputStream,
            i.writeTo(e);
        this._client.send(e.getBuffer())
    }

    _login(){
        let t = new HUYA.WSVerifyCookieReq;
        t.lUid = parseInt(this._get_cookie_value("yyuid")),
            t.sUA = "webh5&2004231432&websocket",
            t.sCookie = this._cookie_convert(),
            t.sGuid = "";
        let r = new Taf.JceOutputStream;
        t.writeTo(r);
        let n = new HUYA.WebSocketCommand;
        n.iCmdType = HUYA.EWebSocketCommandType.EWSCmdC2S_VerifyCookieReq,
            n.vData = r.getBinBuffer(),
            r = new Taf.JceOutputStream,
            n.writeTo(r);
        this._client.send(r.getBuffer())
    }

    async _get_chat_info() {
        try {
            let body = await r({
                url: `https://m.huya.com/${this.room_id}`
            });
            let info = {};
            let subsid_array = body.match(/var SUBSID = '(.*)';/);
            let topsid_array = body.match(/var TOPSID = '(.*)';/);
            let yyuid_array = body.match(/ayyuid: '(.*)',/);
            let anthor_nick = body.match(/var ANTHOR_NICK = '(.*)';/)
            if (!subsid_array || !topsid_array || !yyuid_array) {
                return;
            }
            info.subsid = subsid_array[1] === '' ? 0 : parseInt(subsid_array[1]);
            info.topsid = topsid_array[1] === '' ? 0 : parseInt(topsid_array[1]);
            info.yyuid = parseInt(yyuid_array[1]);
            info.sGuid = "";
            info.anthor_nick = anthor_nick[1] === '' ? '' : anthor_nick[1];
            return info
        } catch (e) {
            log.error(this.getInfo()+"获取房间基本信息异常", e);
        }
    }

    _on_mes(data) {
        try {
            data = to_arraybuffer(data);
            let stream = new Taf.JceInputStream(data);
            let command = new HUYA.WebSocketCommand();
            command.readFrom(stream);
            switch (command.iCmdType) {
                case HUYA.EWebSocketCommandType.EWSCmd_WupRsp:
                    try{
                        let wup = new Taf.Wup()
                        wup.decode(command.vData.buffer)
                        let map = new (TafMx.WupMapping[wup.sFuncName])()
                        wup.readStruct('tRsp', map, TafMx.WupMapping[wup.sFuncName])
                        this._emitter.emit(wup.sFuncName, map)
                    }catch (e) {
                        log.error("返回方法处理异常", e)
                    }
                    break
                case HUYA.EWebSocketCommandType.EWSCmdS2C_MsgPushReq:
                    stream = new Taf.JceInputStream(command.vData.buffer);
                    let msg = new HUYA.WSPushMessage();
                    msg.readFrom(stream);
                    stream = new Taf.JceInputStream(msg.sMsg.buffer);
                    if (TafMx.UriMapping[msg.iUri]) {
                        let map = new (TafMx.UriMapping[msg.iUri])();
                        map.readFrom(stream);
                        this._emitter.emit(msg.iUri, map)
                    }
                    break;
                case HUYA.EWebSocketCommandType.EWSCmdS2C_VerifyCookieRsp:
                    stream = new Taf.JceInputStream(command.vData.buffer);
                    let g = new HUYA.WSVerifyCookieRsp;
                    g.readFrom(stream);
                    this.isLogin = g.iValidate == 0;
                    if(this.isLogin){
                        log.info(this.getInfo()+"登录成功");
                        this.emit("loginSuccess");
                        this._heartbeat();
                        this._heartbeat_timer = setInterval(this._heartbeat.bind(this), heartbeat_interval)
                    }else{
                        log.info(this.getInfo()+"登录失败");
                        this.emit("loginFail");
                        this.isRun = false;
                        this.exit();
                    }
                    break;
                default:
                    break
            }
        } catch (e) {
            log.error("接收信息出错", e);
        }
    }

    _heartbeat() {
        if(!this.isRun){
            this.exit();
            return;
        }
        let heart_beat_req = new HUYA.UserHeartBeatReq()
        // let user_id = new HUYA.UserId()
        // user_id.sHuYaUA = "webh5&1.0.0&websocket"
        heart_beat_req.tId = this.getUserId();
        heart_beat_req.lTid = this._info.topsid
        heart_beat_req.lSid = this._info.subsid
        heart_beat_req.lPid = this._info.yyuid
        heart_beat_req.eLineType = 1;
        heart_beat_req.lShortTid = 0;
        heart_beat_req.bWatchVideo = true;
        heart_beat_req.eLineType = HUYA.EStreamLineType.STREAM_LINE_AL;
        heart_beat_req.iFps = 0;
        heart_beat_req.iAttendee = 0;
        heart_beat_req.iLastHeartElapseTime = 0;
        this._send_wup("onlineui", "OnUserHeartBeat", heart_beat_req)
    }

    _send_wup(action, callback, req) {
        try {
            let wup = new Taf.Wup()
            wup.setServant(action)
            wup.setFunc(callback)
            wup.writeStruct("tReq", req)
            let command = new HUYA.WebSocketCommand()
            command.iCmdType = HUYA.EWebSocketCommandType.EWSCmd_WupReq
            command.vData = wup.encode()
            let stream = new Taf.JceOutputStream()
            command.writeTo(stream)
            this._client.send(stream.getBuffer())
        } catch (err) {
            this.emit('error', err)
        }
    }

    _connect(){
    }

    _stop() {
        this._starting = false
        this._emitter.removeAllListeners()
        clearInterval(this._ping_timer)
        clearInterval(this._heartbeat_timer)
        clearInterval(this._fresh_gift_list_timer)
        this._client && this._client.terminate()
    }

    getUserId(){
        let userId = new HUYA.UserId();
        userId.lUid = parseInt(this._get_cookie_value("yyuid")),
            userId.sGuid = this._info.sGuid,
            userId.sToken = "",
            userId.sHuYaUA = "webh5&2004231432&websocket",
            userId.sCookie = this._cookie_convert(),
            userId.sDeviceInfo = "Chrome";
        return userId;
    }

    sendMsg(content){
        var n = new HUYA.SendMessageReq;
        if (n.tUserId = this.getUserId(),
            n.lTid = this._info.yyuid,
            n.lSid = this._info.yyuid,
            n.lPid = this._info.yyuid,
            n.sContent = content,
            n.tBulletFormat = new HUYA.BulletFormat) {
            var a = new HUYA.MessageTagInfo;
            a.iAppId = 1,
                a.sTag = "",
                n.vTagInfo.value.push(a)
        }
        let wup = new Taf.Wup()
        wup.setServant("liveui")
        wup.setFunc("sendMessage")
        wup.writeStruct("tReq", n)
        let command = new HUYA.WebSocketCommand()
        command.iCmdType = HUYA.EWebSocketCommandType.EWSCmd_WupReq
        command.vData = wup.encode()
        let stream = new Taf.JceOutputStream()
        command.writeTo(stream)
        this._client.send(stream.getBuffer())
    }

    _get_cookie_value(name){
        for(let item of this.cookies){
            if(item.name == name){
                return item.value.trim();
            }
        }
        return '';
    }

    _cookie_convert(){
        let cookieStr = "";
        for(let item of this.cookies){
            if(!item.name || !item.value || item.name == 'undefined' || item.value == 'undefined'){
                continue;
            }
            if(cookieStr){
                cookieStr += "; "
            }
            cookieStr += item.name + "=" + item.value.trim();
        }
        return cookieStr;
    }

    sendDoLaunch() {
        let e = new HUYA.LiveLaunchReq;
        e.tId = this.getUserId();
        e.tLiveUB.eSource = HUYA.ELiveSource.WEB_HUYA;
        e.bSupportDomain = 1;
        this._send_wup('liveui', 'doLaunch', e);
    }

    sendPingReq() {
        if(!this.isRun){
            this.exit();
            return;
        }
        let currTime = Date.now();
        if(currTime - this.startTime > 30*1000 && !this.isLogin){
            log.info(this.getInfo()+"登录超时");
            this.exit();
            return;
        }
        let i = new HUYA.VideoGatewayProxy2VGPingReq();
        i.lLocalTime = .001 * currTime >> 0;
        this._send_wup('videogateway', 'videoGatewayProxy2VGPing', i);
    }


    getSequence() {
        let i = new HUYA.GetSequenceReq;
        i.tId = this.getUserId(),
            i.iSeqNum = 1,
            i.iFromType = 5,
            i.iBusinessType = 1;
        let r = [this._get_cookie_value("yyuid"), i.iSeqNum, i.iFromType, i.iBusinessType, "AzCXiouW6aLc4AsVGKAOOLlNLawNQsuV"].join("");
        r = md5(r),
            i.sSgin = r,
            console.log(i);
            this._send_wup("sequenceui", "getSequence", i)
    }

    consumeGift(sPayId, iItemType, iItemCount) {
        var l = "<expand><prop nobel_level='{0}'/></expand>";
        l = l.replace("{0}", 0);//e.nobleInfo ? e.nobleInfo.iNobleLevel : 0
        var f = new HUYA.ConsumeGiftReq;
        f.lSid = this._info.topsid,
        f.lSubSid = this._info.subsid,
        f.sSenderNick = this.nickname,
        f.sPresenterNick = this._info.anthor_nick,
        f.tId = this.getUserId(),
        f.tId.sToken = this._get_cookie_value("udb_n"),
        f.tId.iTokenType = 3,
        f.iShowFreeitemInfo = 0,
        f.iItemType = iItemType,
        f.iItemCount = iItemCount,
        f.lPresenterUid = this._info.yyuid,
        f.sPayId = sPayId;
        f.sSendContent = "";
        var w = function() {
            var t = "1111";
            t || (t = "1111");
            var e = t.split("")
                , i = e[2];
            return e[2] = e[3],
                e[3] = i,
                e.reverse(),
                t = e.join(""),
            parseInt(t + "0", 2) + 1
        }();
        w += 64,
            f.iPayPloy = w,
            f.iFromType = 5,
            f.sExpand = l,
            f.iTemplateType = 5,
            f.sPassport = this._get_cookie_value("username"),
            f.iEventType = 0;
        var I = "";
        f.sSign = md5(f.tId.lUid + f.lSid + f.lSubSid + f.iShowFreeitemInfo + f.iItemType + f.iItemCount + f.lPresenterUid + f.sPayId + f.iPayPloy + f.iFromType + f.iTemplateType + f.sPassport + f.iEventType + I),
        f.iUseType = 0;
        log.info(f);
        this._send_wup("PropsUIServer", "consumeGift", f)
    }


}

module.exports = client;