var Trello = require('node-trello');
var nconf = require("./config.js");
var when = require('when');
var utils = require('./utils'); 

var TrelloRepository = function(options) {
	
	// Ensure new
	if (!(this instanceof TrelloRepository))
		return new TrelloRepository();
	
	var self = this;

	var defaults = {
		publicKey: nconf.get('trello.public_key'),
		token: nconf.get('trello.token'),
		boardID: nconf.get('trello.board_id'),
		fields: nconf.get('trello.fields'),
		debug: nconf.get('debug.trello') || false
	};

	options = options || {};
	
	
	// public fields
	this.boardID = options.boardID || defaults.boardID; // delay between writes and reads
	this.fields = options.fields || defaults.fields; 
	this.debug = options.debug || defaults.debug; 
	
	// Private fields
	var publicKey = options.publicKey || defaults.publicKey;
	var token = options.token || defaults.token;
	var trello = new Trello(publicKey, token);

	// Get an estimate from a title
	var estimatePattern = /^\\(([0-9\\.]+)\\).*/;
	this.getEstimate = function getEstimate(title) {
		var match = estimatePattern.exec(title);
		if (match !== undefined && utils.isNumber(match[1])) {
			return parseFloat(match[1]);
		} else {
			return undefined;
		}
	};

	this.getCards = function(options) {
		
		options = options || {};
		
		var cards = [];
		var cardFields = (self.fields || nconf.get("fields")).map(function (str) {return str.toLowerCase().trim(); });
		
		// Make sure name is in there, since we'll need it for estimates
		if (cardFields.indexOf("name") === -1) {
			cardFields[cardFields.length] = "name";
		}
		
		var currentDate = new Date();
		var currentDateAsStr = utils.dateAsStr(currentDate);

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
					//card.estimate = self.getEstimate(card.name);
				
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
};

module.exports = TrelloRepository;