//http://www.elasticsearch.org/guide/en/elasticsearch/reference/0.90/indices-update-settings.html

/**
 * New node file
 */

var u = require('./utils.js');
var ElasticSearch = require('elasticsearch');
var nconf = require('./config.js');
var when = require('when');
var delay = require('when/delay');
var es = new ElasticSearch.Client();

var nextCardID = 0;
function createFakeCard(label, estimate, list, reportDate) {
	estimate = estimate || 1;
	label = label || '';
	list = list || 'Done';
	reportDate = reportDate || new Date();
	var reportDateAsStr = u.dateAsStr(reportDate);
	
	var card = {
			id: nextCardID + "-" + reportDateAsStr,
			guid: nextCardID,
			desc: "Card: " + nextCardID + "-" + reportDateAsStr,
			name: 'Card: ' + nextCardID,
			labels: [label],
			estimate: estimate,
			list: list,
			reportDate: reportDate,
			reportDateAsStr: reportDateAsStr
	};
	nextCardID++;
	return card;
}

function copyCard(card, reportDate) {

	reportDate = reportDate || new Date();
	var reportDateAsStr = u.dateAsStr(reportDate);
	
	if (reportDateAsStr === card.reportDateAsStr)
		throw new Error("You need to set a new report date when copying card! " + card.id + "-" + card.reportDateAsStr);
	
	var newCard = {
			id: card.guid + "-" + reportDateAsStr,
			guid: card.guid,
			desc: "Card: " + card.id + "-" + reportDateAsStr,
			name: 'Card: ' + card.id,
			labels: card.labels,
			estimate: card.estimate,
			list: card.list,
			reportDate: reportDate,
			reportDateAsStr: reportDateAsStr
	};
	nextCardID++;
	
	return newCard;
}

function createFakeCards(date) {
	var statuses = ['To Do', 'Doing', 'Code Review', 'QA', 'Ready for Sign-off', 'Done', 'Future Sprints'];
	var scopes = ['Original Scope', 'Discovered', 'Optional', 'New Scope', 'Outside of Scope'];
	var fakeCards = [];
	date = date || new Date();
	
	var estimate = 0;
	statuses.map(function(status) { 
		scopes.map(function (scope) {
			fakeCards[fakeCards.length] = createFakeCard(scope, estimate++, status, date);
		});
	});
	
	return fakeCards;
}

function newDay(fakeCards, reportDate) {
	var newCards = [];
	fakeCards.map(function (card){
		var newCard = copyCard(card, reportDate);
		newCards[newCards.length] = newCard;
	});
	return newCards;
}

function createScenario(status, scope, days, incr) {
	// This will increase the estimates of a particular scope / scenario
	// over a course of days
	days = days || 10;
	incr = incr || 1;
	var reportDate = new Date(); 
	
	var lastCards = createFakeCards(reportDate);
	var scenario = [];
	scenario = scenario.concat(lastCards);
	
	for (var x = 0; x<days; x++) {
		reportDate = u.addDays(reportDate, 1);
		var newCards = newDay(lastCards, reportDate);
		newCards.map(function (card) {
			if (status === undefined || status === card.status)
				if (scope === undefined || scope === card.scope)
					card.estimate += incr;
		});
		scenario = scenario.concat(newCards);
		lastCards = newCards;
	}
	
	return scenario;
}


function createFirstScenario() {
	return createScenario(undefined, undefined, 5, 1);
}

function saveCards(cards) {
	var promises = cards.map(function (c) {
		var doc = {
			index: nconf.get('test.elastic.index'),
			type: nconf.get('test.elastic.type'),
			id: c.id + c.reportDate,
			body: c  
		};
		
		return es.index(doc).then(function(res)	{
			//console.log("Saved " + c.id);
		});
	});

	return when.all(promises);
}

function trashTestIndex() {
	return when(es.indices.delete({index: nconf.get('test.elastic.index')}))
	.then(function (data) { console.log("Deleted index");})
	.catch(function(err) { console.log("Test index not deleted due to " + err);});
}

function dumpCards(data) {
	console.log(data);
	console.log(data.length);
	return data;
}

function findCards() {
	return es.search({
		index: nconf.get('test.elastic.index'),
		q:"*",
		size:0
	}).then(function (res) {
		console.log(res.hits.total);
	});
}

function dumpMapping() {
	return when(es.indices.getMapping({
		index: nconf.get('test.elastic.index'),
		type: nconf.get('test.elastic.type'),
	}))
	.then(function(data) {console.log(data.card)});
}

function createMapping() {
	// http://elasticsearch-users.115913.n3.nabble.com/Problem-Facets-tokenize-tags-with-spaces-Is-there-a-solution-td3651335.html
	return when(es.indices.putMapping({
		index: nconf.get('test.elastic.index'),
		type: nconf.get('test.elastic.type'),
		body: {
 			"card": {
				"properties": {
					"list" : {
						"type" : "string", 
						"analyzer" : "string_lowercase"
					}
				}
			},
		}
	
	}))
	.then(function(data) {console.log("Mapping Created.")});
}

function createTestIndex() {
	return when(es.indices.create({
		index: nconf.get('test.elastic.index'),
		body: { 
			"analysis": {
				"analyzer": {
	            	"string_lowercase": {
	                	"tokenizer": "keyword",
	                	"filter": "lowercase"
	            	}
	        	}
			}
		}
	}))
	.then(function(data) {console.log("Index Created.")});
}


function resetTestIndex() {
	return delay(
			when(trashTestIndex())
			.then(createTestIndex)
			.then(createMapping)
			.then(createFirstScenario)
			//.then(dumpCards)
			.then(saveCards)
	,1000)
	.then(findCards);
}


function totalByField(field, values) {
	// Create the facets we need
	var facets = {
		"estimates_by_status" : {
			"date_histogram" : {
				"key_field" : "reportDate",
				"value_field" : "estimate",
				"interval": "day"
			},
			"facet_filter" : {
				"term" : { "list" : values[0] }
			}
			
		}			
	};
	
	return es.search({
		index: nconf.get('test.elastic.index'),
			body: {
				"query" : {
				"match_all" : {  }
			},
			"facets" : facets
		},
		size:0
	}).then(function(data) {
		console.log(data.facets.estimates_by_status);
	});
}

function totalByStatus() {
	return totalByField("list", ["to do"]);
}
function totalByScope() {
	return totalByField("labels", ["original scope"]);
}

function dumpFirstCard() {
	return es.search({
		index: nconf.get('test.elastic.index'),
		q: "+list:done", 
		size:10000
	}).then(function (res) {
		if (res.hits.total != 0)
			console.log(res.hits.hits[0]._source);
		else 
			console.log("No match");
	});
}

debug = false;
if (debug) 
{
	when(trashTestIndex())
	.then(createTestIndex)
	.then(createMapping)
	.then(createFirstScenario)
	.then(saveCards)
	.then(dumpMapping)
	.then(function (data) { setTimeout( process.exit,100);})
	.catch(function(err) {console.log("Error: ".red + err); process.exit(); });
}
else {
	when(resetTestIndex())
	.then(dumpFirstCard)
	.then(totalByStatus)
	.then(dumpMapping)
	.then(function (data) { setTimeout( process.exit,100);})
	.catch(function(err) {console.log("Error: ".red + err); process.exit(); });
}


/*
{ desc: { type: 'string' },
estimate: { type: 'long' },
guid: { type: 'long' },
id: { type: 'string' },
labels: { type: 'string' },
list: { type: 'string' },
name: { type: 'string' },
reportDate: { type: 'date', format: 'dateOptionalTime' },
reportDateAsStr: { type: 'string' } }
*/