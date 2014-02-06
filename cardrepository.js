/**
 * New node file
 */

var extend = require("xtend");
var ElasticSearch = require('elasticsearch');
var nconf = require("./config.js");
var when = require('when');
var delay = require('when/delay');

var CardRepository = function(options) {
	
	var self = this;

	var defaults = {
		index: nconf.get('elastic.index'),
		type: nconf.get('elastic.type'),
		delay: 0
	};

	options = options || {};
	
	// public fields
	this.index = options.index || defaults.index;
	this.type = options.type || defaults.type;
	this.delay = options.delay || defaults.delay; // delay between writes and reads
	
	// Private fields
	es = new ElasticSearch.Client();
	
	// Private (no this)
	runQuery = function(query) {
		return es.search({
			index: self.index,
			q: query || "*", 
			size:10000
		});
	};
	
	this.create = function() {
		return when(es.indices.create({
			index: self.index,
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
		.then(function (data) {
			return es.indices.putMapping({
				index: self.index,
				type: self.type,
				body: {
					"card": {
						"properties": {
							"list" : {
								"type" : "string", 
								"analyzer" : "string_lowercase"
							},
							"labels" : {
								"type" : "string", 
								"analyzer" : "string_lowercase"
							}
						}
					}
				}
			});
		});
	};
	
	this.drop = function() {
		return when(es.indices.delete({
			index: self.index
		})).then(function (data) {
			return self;
		}).catch(function (err) {
			console.log("Did not delete " + self.index + " due to " + err);
			return self;
		});
	};
	
	this.queries = {};
	
	this.queries.byStatus = function(status) {
		return "+list:" + status.replace(" ", "\\ ");
	};
	this.queries.byScope = function(scope) {
		return "+labels:" + scope.replace(" ", "\\ ");
	};
	
	this.count = function(query) {
		return runQuery(query)
		.then(function (res) {
			return res.hits.total;
		});
	};

	this.find = function(query) {
		return runQuery(query)
			.then(function (res) {
				if (res.hits.total === 0)
					return undefined;
				else
					return res.hits.hits.map(function (r) { return r._source; });
			});
	};
	
	this.first = function(query) {
		return self.find(query)
		.then(function (res) {
			if (res === undefined)
				return undefined;
			else
				return res[0];
		});
	};
	
	this.estimateByFieldValues = function(field, values) {

		// The values need to be lower case
		lower_values = values.map(function(s) {return s.toLowerCase();});
		
		// Create the facets we need
		var facets = {};
		
		// Create a histogram facet for each of the values we care about
		lower_values.forEach(function(value, i) {
			var facet_filter = {};
			facet_filter[field] = value;
			var facet = {
				"date_histogram" : {
					"key_field" : "reportDate",
					"value_field" : "estimate",
					"interval": "day"
				},
				"facet_filter" : {
					"term" : facet_filter
				}
			};
			facets["facet_" + i] = facet;
		});

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
			// Once we have the data back, convert it in to a better format
			var result = [];
			values.forEach(function(facet, i) {
				var stats = data.facets["facet_" + i];
				result[i] = { key : values[i] };
				result[i].values = facet.entries.map(function(entry) {
					return {time: entry.time, estimate: entry.total};
				});
			});
			return result;
		});
	};
	
	
	this.saveCard = function(card) {
		var doc = {
			index: nconf.get('test.elastic.index'),
			type: nconf.get('test.elastic.type'),
			id: card.id,
			body: card  
		};
		
		return es.index(doc);
	};

	this.saveCards = function(cards) {
		var promises = cards.map(function (c) {
			return self.saveCard(c);
		});
		return when.all(promises);
	};
	
};

x = new CardRepository();

module.exports = CardRepository;