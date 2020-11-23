const md5 = require('md5');
const signUtil = {};

signUtil.getMd5 = function(body){
    if(!body){
        return "";
    }
    let str = "";
    let list = new Array();
    for(let key in body){
        let value = body[key];
        if(!value){
            continue;
        }
        list.push(key);
    }
    list.sort();
    for(let key of list){
        let value = body[key];
        if(str){
            str += "&";
        }
        if(typeof value == "object"){
            value = JSON.stringify(value);
            value = value.replace(/"/g, "");
            value = value.replace(/:/g, "=");
        }
        str += key + "=" + value;
    }
    str += "&signPassword=UgRLei0LtV6088EUF70ba0SB0W2dwB8C";
    return md5(str, {encoding:"utf-8"});
};
module.exports = signUtil;