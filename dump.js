// node dump.js --date 01/30/2014

var Trello = require('node-trello');
var ElasticSearch = require('elasticsearch');
var utils = require('./utils.js');
var nconf = require('./config.js');

var es = new ElasticSearch.Client();
var trello = new Trello(nconf.get('public_key'), nconf.get('token'));

function debug(obj) {
    return JSON.stringify(obj);
}

function properties(obj) {
    return Object.keys(obj);
}

// check to see if we were passed in a date via the command line
// otherwise, default to today

var dateStamp = nconf.get('date');
if (dateStamp == undefined) {
    dateStamp = utils.dateStamp();
}

trello.get("/1/boards/"+ nconf.get("board_id") + "/lists", function (err, data) {
    var result = data.map(function(list) {
        estimateList(list, printEstimate);
    });
});

// Consider http://stackoverflow.com/questions/16045165/sum-query-in-elasticsearch

function estimateList(list, callback) {
    es.search({
        index: nconf.get('elastic.index'),
        q: '+reportDate:' + dateStamp + ' +listID:' + list.id, // + ' +colors:orange',
        size:10000,
        fields: ["estimate", "statusID"]
    }, function (err, res) {
        // console.log(debug(res));
        var cards = res.hits.total;

        var estimates = res.hits.hits.map(function (i) {
            if (i.fields != undefined && i.fields.estimate != undefined && utils.isNumber(i.fields.estimate))
                return parseFloat(i.fields.estimate);
            else
                return undefined;
        });
        var haveEstimates = estimates.filter(function(i) { return (i != undefined)});
        var missing = cards - haveEstimates.length;
        
        var total = haveEstimates.reduce(function(a, b) {
            return a + b;
        });
        
        var estimate = {
            cards: cards,
            missing: missing,
            total: total
        };
        
        callback(list, estimate);
    });
}

function printEstimate(list, estimate) {
    console.log("[" + list.name + "]");
    console.log("\tCards: " + estimate.cards);
    console.log("\tEstimate: " + estimate.total);
    console.log("\tNo Estimates: " + estimate.missing);
}
