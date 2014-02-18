var Trello = require('node-trello');
var nconf = require("./config.js");
var when = require('when');
var u = require('./utils'); 

// https://api.trello.com/1/boards/52ea5661407c28d75e495891?fields=name,desc&key=[application_key]&token=[optional_auth_token]

var TrelloRepository = function(options) {
	
	// Ensure new
	if (!(this instanceof TrelloRepository))
		return new TrelloRepository();
	
	var self = this;

	var defaults = {
		publicKey: nconf.get('trello_publicKey'),
		token: nconf.get('trello_token'),
		boardID: nconf.get('trello_boardID'),
		fields: nconf.get('trello_fields'),
		debug: nconf.get('debug_trello') || false
	};

	options = options || {};
	
	
	// public fields
	this.boardID = options.boardID || defaults.boardID; // delay between writes and reads
	this.fields = options.fields || defaults.fields; 
	this.debug = options.debug || defaults.debug; 
	this.cache = {};
	
	// Private fields
	var publicKey = options.publicKey || defaults.publicKey;
	var token = options.token || defaults.token;
	var trello = new Trello(publicKey, token);

	// Get an estimate from a title
	var estimatePattern = /^\(([0-9\.]+)\).*/;
	this.getEstimate = function getEstimate(title) {
		var match = estimatePattern.exec(title);
		if (match !== null && u.isNumber(match[1])) {
			return parseFloat(match[1]);
		} else {
			return undefined;
		}
	};

	this.getCards = function(options) {
		
		options = options || {};
		
		var cards = [];
		var cardFields = (self.fields || nconf.get("trello_fields")).map(function (str) {return str.toLowerCase().trim(); });
		
		// Make sure name is in there, since we'll need it for estimates
		if (cardFields.indexOf("name") === -1) {
			cardFields[cardFields.length] = "name";
		}
		if (cardFields.indexOf("id") === -1) {
			cardFields[cardFields.length] = "id";
		}
		
		var currentDate = new Date();
		var currentDateAsStr = u.dateAsStr(currentDate);

		// get all the cards for the board
		return when.promise(function (resolve, reject) {
			var url = "/1/boards/"+ self.boardID + "/lists?cards=open&actions_limit=1000&card_fields=" + cardFields.join(',') + "&labels=true";
			if (self.debug) console.log("Retrieving cards from: " + url);
			trello.get("/1/boards/"+ self.boardID + "/lists?cards=open&actions_limit=1000&card_fields=" + cardFields.join(',') + "&labels=true", function(err, data) {
				if (err) reject(err); else resolve(data);
			});
		})
		.then(function(lists) {
			if (self.debug)
				console.log(lists.length + " lists found");
			
			// Add some more detail to the card objects
			// Namely - colors, estimates, and labels
			lists.forEach(function(list) {
				var listName = list.name;
				var listID = list.id;
				if (self.debug)
					console.log(listName + ": has " + list.cards.length + " cards");
				
				list.cards.forEach(function(card) {
					// Set the estimate
					card.estimate = self.getEstimate(card.name);
				
					// Set the list
					card.listID = listID;
					card.list = listName;
				
					// Parse the labels
					if (card.labels !== undefined) {
						card.colors = card.labels.map(function(label) { return label.color; });
						card.labels = card.labels.map(function(label) { return label.name; });
					}
					// Set the report date
					card.reportDate = currentDate; 
					card.reportDateAsStr = currentDateAsStr;
					cards[cards.length] = card;
				});
			});
			return cards;
		});
		
	};
	
	this.getBoards = function() {
		return when.promise(function (resolve, reject) {
			trello.get("/1/members/me/boards", function (err, data) {
				if (err) reject(err); else resolve(data);
			});
		});
	};
	
	this.populateLists = function() {
		if (self.cache.lists !== undefined)
			return when(self.cache.lists);

		return when.promise(function (resolve, reject) {
			trello.get("/1/boards/"+ self.boardID + "/lists", function (err, data) {
				if (err) reject(err);
				self.cache.listLookup = {};
				self.cache.lists = data.map(function(list) {
					self.cache.listLookup[list.id] = list.name;
					return { id : list.id, name: list.name};
				});
				resolve(self.cache.lists);
			});
		});
	};

	this.lists = function() {
		// Ensure we have lists
		if (self.cache.lists === undefined)
			throw new Error("You need to call lists before lists");
		return self.cache.lists;
	};
	
	// If listID is not populated, returns the entire mapping
	this.listLookup= function(listID) {
		// Ensure we have lists
		if (self.cache.listLookup === undefined)
			throw new Error("You need to call populateLists before listLookup");
		
		if (listID === undefined)
			return self.cache.listLookup;
		else
			return self.cache.listLookup[listID];
	};
	
	this.populateLabels = function() {
		if (self.cache.labels !== undefined)
			return when(self.cache.labels);

		return when.promise(function (resolve, reject) {
			trello.get("/1/boards/"+ self.boardID + "?fields=labelNames", function (err, data) {
				if (err) reject(err);
				self.cache.labelLookup = {};
				self.cache.labels = u.properties(data.labelNames).map(function(color) {
					self.cache.labelLookup[color] = data.labelNames[color];
					return { id : color, name: data.labelNames[color]};
				});
				resolve(self.cache.labels);
			});
		});
	};
	
	this.labelLookup = function(labelID) {
		// Ensure we have lists
		if (self.cache.labelLookup === undefined)
			throw new Error("You need to call populateLabels before labelLookup");
		
		if (labelID === undefined)
			return self.cache.labelLookup;
		else
			return self.cache.labelLookup[labelID];
	};
	
	this.clearCache = function() {
		cache = {};
	};
};

module.exports = TrelloRepository;