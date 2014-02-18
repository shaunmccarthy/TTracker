/**
 * New node file
 */

var extend = require("xtend");
var ElasticSearch = require('elasticsearch');
var nconf = require("./config.js");
var when = require('when');
var delay = require('when/delay');
var u = require('./utils.js');

var CardRepository = function(options) {
	
	// Ensure new
	if (!(this instanceof CardRepository))
		return new CardRepository();
	
	var self = this;

	var defaults = {
		index: nconf.get('elastic.index'),
		type: nconf.get('elastic.type'),
		debug: nconf.get('debug.cardrepository') || false,
		delay: 0
	};

	options = options || {};
	
	// public fields
	this.index = options.index || defaults.index;
	this.type = options.type || defaults.type;
	this.delay = options.delay || defaults.delay; // delay between writes and reads
	this.debug = options.debug || defaults.debug;
	
	// used to cache data from searches
	this.cache = {};
	
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
	
	this.create = function(raise) {
		raise = (raise !== undefined) ? raise : true;
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
							},
							"estimate" : {
								"type" : "double"
							}
						}
					}
				}
			});
		})
		.catch(function (err) {
			if (raise) throw err;
			if (err.message === undefined) throw err;
			if (err.message.indexOf("IndexAlreadyExistsException") === -1 ) throw err;
		});
	};
	
	this.drop = function(index) {
		index = index || self.index;
		
		return when(es.indices.delete({
			index: index
		})).then(function (data) {
			return self;
		});
	};
	
	this.queries = {};
	
	this.queries.byStatus = function(status) {
		return "+list:" + status.replace(/ /g, "\\ ");
	};
	this.queries.byScope = function(scope) {
		return "+labels:" + scope.replace(/ /g, "\\ ");
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
	
	this.dumpFirst = function dumpFirstCard(query) {
		return self.first(query)
			.then(function (res) {
				if (res === undefined)
					console.log("No Matches");
				else
					console.log(res);
			});
	};
	
	this.dumpMapping = function(index, type) {
		console.log(index);
		console.log(type);
		return when(es.indices.getMapping({
			index: index || self.index,
			type: type || self.type,
		}))
		.then(function(data) {console.log(data[type || self.type]);});
	};
	
	this.estimateByFieldValues = function(field, values, translate) {

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
			index: self.index,
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
				result[i] = { key : (translate === undefined) ? values[i] : translate[values[i]] };
				result[i].values = stats.entries.map(function(entry) {
					return {time: entry.time, estimate: entry.total};
				});
			});
			return result;
		});
	};
	
	
	this.saveCard = function(card) {
		card.reportDate = card.reportDate || new Date();
		card.reportDateAsStr = u.dateAsStr(card.reportDate);
			
		var doc = {
			index: self.index,
			type: self.type,
			id: card.id + "-" + card.reportDateAsStr.replace(/\//g,"."),
			body: card  
		};
		
		var promise = es.index(doc);
		if (self.debug)
			promise = promise.then(function(data) {console.log(data);});
		
		return promise;
	};

	this.saveCards = function(cards) {
		var promises = cards.map(function (c) {
			return self.saveCard(c);
		});
		return when.all(promises);
	};
	
	this.getValuesForField = function(field) {
		return es.search({
			index: self.index,
				body: {
					"query" : {	"match_all" : {  }	},
					"facets" : {
						"tags" : { "terms" : {"field" : field }}
					}
			},
			size:0
		}).then(function(data) {
			// Once we have the data back, convert it in to a better format
			var tags = data.facets.tags;
			tags.map(function(entry) {
				console.log(entry);
				return entry;
			});
			return tags;
		});			
	};
	
	this.getScopeIDs = function() {
		return self.getValuesForField("colors");
	};
	
	this.getStatusIDs = function() {
		return self.getValuesForField("listID");
	};
	
	this.getIndices = function() {
		return es.indices.getAliases({});
	};
	
};

module.exports = CardRepository;