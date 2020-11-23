const log4js = require('log4js');
let pre = "log";
let pre_2 = "log2";
let layout = {
    type: 'pattern',
    pattern: '[%d{yyyy-MM-dd hh:mm:ss.SSS}] [%p] - %m'
};

log4js.configure({
    appenders:{
        console:{//记录器1:输出到控制台
            type : 'console',
            layout: layout
        },
        data_file:{//：记录器3：输出到日期文件
            type: "dateFile",
            filename: __dirname + `/../logs/${pre}`,//您要写入日志文件的路径
            alwaysIncludePattern: true,//（默认为false） - 将模式包含在当前日志文件的名称以及备份中
            daysToKeep:10,//时间文件 保存多少天，距离当前天daysToKeep以前的log将被删除
            //compress : true,//（默认为false） - 在滚动期间压缩备份文件（备份文件将具有.gz扩展名）
            pattern: "-yyyy-MM-dd.log",//（可选，默认为.yyyy-MM-dd） - 用于确定何时滚动日志的模式。格式:.yyyy-MM-dd-hh:mm:ss.log
            encoding : 'utf-8',//default "utf-8"，文件的编码
            layout: layout
        },
        error_file:{//：记录器4：输出到error log
            type: "dateFile",
            filename: __dirname + `/../logs/${pre}_error`,//您要写入日志文件的路径
            alwaysIncludePattern: true,//（默认为false） - 将模式包含在当前日志文件的名称以及备份中
            daysToKeep:10,//时间文件 保存多少天，距离当前天daysToKeep以前的log将被删除
            //compress : true,//（默认为false） - 在滚动期间压缩备份文件（备份文件将具有.gz扩展名）
            pattern: "-yyyy-MM-dd.log",//（可选，默认为.yyyy-MM-dd） - 用于确定何时滚动日志的模式。格式:.yyyy-MM-dd-hh:mm:ss.log
            encoding : 'utf-8',//default "utf-8"，文件的编码
            // compress: true, //是否压缩
            layout: layout
        },
        data_file_2:{//：记录器3：输出到日期文件
            type: "dateFile",
            filename: __dirname + `/../logs/${pre_2}`,//您要写入日志文件的路径
            alwaysIncludePattern: true,//（默认为false） - 将模式包含在当前日志文件的名称以及备份中
            daysToKeep:10,//时间文件 保存多少天，距离当前天daysToKeep以前的log将被删除
            //compress : true,//（默认为false） - 在滚动期间压缩备份文件（备份文件将具有.gz扩展名）
            pattern: "-yyyy-MM-dd.log",//（可选，默认为.yyyy-MM-dd） - 用于确定何时滚动日志的模式。格式:.yyyy-MM-dd-hh:mm:ss.log
            encoding : 'utf-8',//default "utf-8"，文件的编码
            layout: layout
        },
        error_file_2:{//：记录器4：输出到error log
            type: "dateFile",
            filename: __dirname + `/../logs/${pre_2}_error`,//您要写入日志文件的路径
            alwaysIncludePattern: true,//（默认为false） - 将模式包含在当前日志文件的名称以及备份中
            daysToKeep:10,//时间文件 保存多少天，距离当前天daysToKeep以前的log将被删除
            //compress : true,//（默认为false） - 在滚动期间压缩备份文件（备份文件将具有.gz扩展名）
            pattern: "-yyyy-MM-dd.log",//（可选，默认为.yyyy-MM-dd） - 用于确定何时滚动日志的模式。格式:.yyyy-MM-dd-hh:mm:ss.log
            encoding : 'utf-8',//default "utf-8"，文件的编码
            // compress: true, //是否压缩
            layout: layout
        }
    },
    categories: {
        default:{appenders:['data_file', 'console'], level:'info' },//默认log类型，输出到控制台 log文件 log日期文件 且登记大于info即可
        default_2:{appenders:['data_file_2', 'console'], level:'info' },//默认log类型，输出到控制台 log文件 log日期文件 且登记大于info即可
        production:{appenders:['data_file'], level:'warn'},  //生产环境 log类型 只输出到按日期命名的文件，且只输出警告以上的log
        console:{appenders:['console'], level:'debug'}, //开发环境  输出到控制台
        debug:{appenders:['console'], level:'debug'}, //调试环境 输出到log文件和控制台
        error_log:{appenders:['error_file', 'console'], level:'error'}//error 等级log 单独输出到error文件中 任何环境的errorlog 将都以日期文件单独记录
    },
});

const log = log4js.getLogger('default');
const log2 = log4js.getLogger('default_2');
const error = log4js.getLogger('error_log');
module.exports = log;
module.exports.log2 = log2;
module.exports.error = function(message, ...args){
    error.error(message, args)
};