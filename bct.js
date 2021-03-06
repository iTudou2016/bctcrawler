//Bitcointalk ANN crawler

var express = require('express');
var app = express();
const http = require('http');
const cheerio = require('cheerio');
const request = require('request');
const fs = require('fs');
const ANNGAP = 5000;
var Crawler = require("crawler");
var birds = require('./birds');

app.set('views','.');
app.set('view engine', 'pug');
//Middle-ware birds
app.use('/birds', birds);

//GET method route
app.get('/', function(req, res) {
 fetchData(res);
});

app.use(express.static('css'));

// POST method route
app.post('/', function (req, res) {

});

var server = app.listen(8080, function () {
var host = server.address().address;
var port = server.address().port;
  console.log('Bitcointalk crawler listening at http://%s:%s', host, port);
});

//每隔1小时爬一次数据。
setInterval(crawlData, 60*60*1000);
crawlData();

function fetchData(res) {
     report=JSON.parse(fs.readFileSync("crawler.json"));
     res.render('index', {title: 'BCT ANN 更新', message: report});
    
}
function crawlData() {
// Queue just one URL, with default callback
var bctannData = [];
var powData = [];
var mnData = [];
var posData = [];
var task = [];
var filter = JSON.parse(fs.readFileSync("filter.json"));
var lastFilterID = Number(filter.pop().lastFilterID) || 4880000;
var c = new Crawler({
    //maxConnections : 10,
    rateLimit: 500,
    // This will be called for each crawled page
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            var $ = res.$;
            process.stdout.write(".");
            // $ is Cheerio by default
            //a lean implementation of core jQuery designed specifically for the server
            $("[id^='msg_4']").each(function(i, e) {
	        var ann_msgID = $(e).attr('id').replace("msg_", "");
	        var ann_title = $(e).text();
	        var ann_href = $(e).find('a').attr('href');
                var ann_topicID = Number(ann_href.slice(40, -2));
                if(ann_topicID-ANNGAP>lastFilterID) {lastFilterID = ann_topicID - ANNGAP;}
                if(ann_title.search(/ANN/)>-1&&ann_topicID>lastFilterID ) {
                    if(/\b(POW|CPU|X18|X22|YESCRYPTR32|LYRA2Z|ETHASH|X16R|QUARK|XEVAN|NEOSCRYPT|SCRYPT)\b/i.test(ann_title)&&!/\b(ICO|AIRDROP|WHITELIST|SALE|PRESALE)\b/i.test(ann_title)) {
	                // 向pow数组插入数据
    	                powData.push({
 		            ann_topicID : ann_topicID,
		            ann_title : ann_title,
		            ann_href : ann_href,
	                });
                    } else if (/\b(MASTERNODES|MASTERNODE|MN)\b/i.test(ann_title)) {
	                // 向mn数组插入数据
	                mnData.push({
 		            ann_topicID : ann_topicID,
		            ann_title : ann_title,
		            ann_href : ann_href,
	                });
                    } else if (/\b(POS|DPOS|ICO|WHITELIST|SALE|PRESALE)\b/i.test(ann_title)) {
	                // 向pos数组插入数据
	                posData.push({
 		            ann_topicID : ann_topicID,
		            ann_title : ann_title,
		            ann_href : ann_href,
	                });
                    }
                 }
            });
        }
        done();
    }
});
process.stdout.write(new Date().toLocaleTimeString() + ": Crawler work starting.");
//每次爬取20页数据
  for (var i=0; i<20; i++)
  {
       task.push('https://bitcointalk.org/index.php?board=159.' + i*40);
  }
c.queue(task);
c.on('drain',function(){
    // 异步数据处理
   process.stdout.write("\n");
   bctannData.push({"powData" : powData});
   bctannData.push({"mnData" : mnData});
   bctannData.push({"posData" : posData});
   console.log(new Date().toLocaleTimeString() + ": Crawler work done. " + (posData.length+mnData.length+powData.length) + " links crawled!");
   bctannData.push({"updateTime" : new Date(new Date().getTime() + 28800000).toLocaleTimeString()});
   filter.push({"lastFilterID" : lastFilterID});
   fs.writeFileSync("crawler.json", JSON.stringify(bctannData));
   fs.writeFileSync("filter.json", JSON.stringify(filter));
});
}
