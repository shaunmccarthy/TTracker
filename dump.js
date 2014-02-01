// node dump.js --date 01/30/2014

var Trello = require('node-trello');
var ElasticSearch = require('elasticsearch');
var u = require('./utils.js');
var nconf = require('./config.js');
var when = require('when');
var callbacks = require('when/callbacks');

var es = new ElasticSearch.Client();
var trello = new Trello(nconf.get('public_key'), nconf.get('token'));

// Consider http://stackoverflow.com/questions/16045165/sum-query-in-elasticsearch
function summarizeEstimates(res, estimate) {
	var cards = res.hits.total;

	var estimates = res.hits.hits.map(function (i) {
		if (i.fields !== undefined && i.fields.estimate !== undefined && u.isNumber(i.fields.estimate))
			return parseFloat(i.fields.estimate);
		else
			return undefined;
	});
	var haveEstimates = estimates.filter(function(i) { return (i !== undefined);});
	var missing = cards - haveEstimates.length;
	
	var total = haveEstimates.reduce(function(a, b) {
		return a + b;
	}, 0);
	
	estimate.cards = cards;
	estimate.missing = missing;
	estimate.total = total;
}

function estimatesByQueries(queries, callback) {
	var estimates = [];
	var promises = queries.map(function(query) {

		var estimate = {};
		estimate.name = query.name;
		estimates[estimates.length] = estimate;

		return es.search({
			index: nconf.get('elastic.index'),
			q: query.query, 
			size:10000,
			fields: ["estimate", "statusID"]
		}).then(function (res) {
			summarizeEstimates(res, estimate);
			return estimate;
		});
	});

	return when.all(promises);
}

function estimatesByStatus(callback) {
	return when.promise( function (resolve, reject) {
		trello.get("/1/boards/"+ nconf.get("board_id") + "/lists", function (err, data) {
			if (err) reject(err); else resolve(data);
		});
	})
	.then(createListQueries)
	.then(estimatesByQueries)
	.then(printEstimate)
	.catch(function(e) { console.log('Error: ' + e); });
}

function estimatesByLabels(callback) {
	return when.promise(function (resolve, reject) {
		trello.get("/1/boards/"+ nconf.get("board_id") + "/?fields=labelNames", function (err, data) {
			if (err) reject(err); else resolve(data);
		});
	})
	.then(createLabelQueries)
	.then(estimatesByQueries)
	.then(printEstimate)
	.catch(function(e) { console.log('Error: ' + e); });
}

function printEstimate(estimates) {
	estimates.forEach(function (estimate) {
		console.log("[" + estimate.name + "]");
		console.log("\tCards: " + estimate.cards);
		console.log("\tEstimate: " + estimate.total);
		console.log("\tNo Estimates: " + estimate.missing);
	});
}

function createListQueries(data) {
	return data.map(function(list) { return {query : '+listID:' + list.id, name : list.name}; });
}

function createLabelQueries(data) {
	return u.properties(data.labelNames).map(function(label) { return {query : '+colors:' + label, name : data.labelNames[label]}; });
}

//estimatesByLabels().then(process.exit);
//var tasks = [estimatesByLabels(), estimatesByStatus()];
//when.all(tasks).then(process.exit);


function estimate() {
	console.log('ts');
	return es.search({
		index: nconf.get('elastic.index'),
			body: {
				"query" : {
				"match_all" : {  }
			},
			"facets" : {
				"tag_price_stats" : {
					"terms_stats" : {
						"key_field" : "list",
						"value_field" : "estimate"
					}
				}
			}
		},
		size:0,
		fields: ["estimate", "statusID"]
	});
/*
	.then(function (res) {
		return { total: res.facets.stats.total, count: res.facets.stats.count }
	})*/
}

when(estimate())
.then(function (res) {
	console.log(u.debug(res));
})
.then(process.exit)
.catch(function(err) {console.log(err); });