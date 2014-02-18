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
var CardRepository = require('./cardrepository.js');
var cr = new CardRepository({index:nconf.get('test.elastic.index')});
var TrelloRepository = require('./trellorepository.js');
var tr = new TrelloRepository({boardID: nconf.get('test.trello.board_id')});

var statuses = [];
var scopes = [];

var nextCardID = 0;

function createFakeCard(label, estimate, list, reportDate) {
	list = list || {};
	var card = {
			id: nextCardID,
			desc: "Card: " + nextCardID + "-" + u.dateAsStr(reportDate),
			name: 'Card: ' + nextCardID,
			labels: [label.name],
			colors: [label.id],
			estimate: estimate || 1,
			list: list.name || statuses[0].name,
			listID: list.id || statuses[0].id,
			reportDate: reportDate || new Date()
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
			id: card.id,
			desc: "Card: " + card.id + "-" + u.dateAsStr(reportDate),
			name: 'Card: ' + card.id,
			labels: card.labels,
			colors: card.colors,
			estimate: card.estimate,
			list: card.list,
			listID: card.listID,
			reportDate: reportDate
	};
	nextCardID++;
	
	return newCard;
}

function createFakeCards(date) {
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
	
	var increaseEstaimte = function(card) {
		if (status === undefined || status === card.status)
			if (scope === undefined || scope === card.scope)
				card.estimate += incr;
	};
	
	for (var x = 0; x<days; x++) {
		reportDate = u.addDays(reportDate, 1);
		var newCards = newDay(lastCards, reportDate);
		newCards.map(increaseEstaimte);
		scenario = scenario.concat(newCards);
		lastCards = newCards;
	}
	
	return scenario;
}


function createFirstScenario() {
	return createScenario(undefined, undefined, 1000, 1);
	//return [createFakeCard(scopes[0], 1, statuses[0], new Date()),createFakeCard(scopes[0], 0.5, statuses[0], new Date())];
}

function totalByStatus() {
	return cr.estimateByFieldValues("listID", statuses.map(function(status) { return status.id; }), tr.listLookup());
}
function totalByScope() {
	return cr.estimateByFieldValues("colors", scopes.map(function(scope) { return scope.id; }), tr.labelLookup());
}

function printTotals(totals) {
	totals.forEach(function(total) {
		console.log(total.key);
		console.log(total.values);
	});
}

function populateValidStatuses() {
	return tr.populateLists().then(function(data) { statuses = data; return data; });
}

function populateValidScopes() {
	return tr.populateLabels().then(function(data) { scopes = data; return data; });
}

function setup() {
	return delay(
			when(cr.drop())
			.catch(function(err) { console.log("Test index not deleted due to " + err);})
			.then(cr.create)
			.then(populateValidStatuses)
			.then(populateValidScopes)
			.then(createFirstScenario)
			.then(function(cards) { return cr.saveCards(cards); }),
		1000);
}


debug = true;
if (debug) 
{
	when(populateValidStatuses)
	.then(populateValidScopes)
	.then(totalByScope)
	.then(printTotals)
	.then(process.exit)
	.catch(function(err) {console.log("Error: ".red + err); process.exit(); });
}
else {
	setup()
//	.then(function() { return cr.dumpFirst("list:done"); })
	.then(totalByScope)
	.then(printTotals)
	.then(totalByStatus)
	.then(printTotals)
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