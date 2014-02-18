var u = require('./utils.js');
var nconf = require('./config.js');
var when = require('when');
var CardRepository = require('./cardrepository.js');
var TrelloRepository = require('./trellorepository.js');

var RepositoryCache = function(options) {
	
	// Ensure new
	if (!(this instanceof RepositoryCache))
		return new RepositoryCache();
	
	var self = this;
	this.cardRepositoryCache = {};
	this.trelloRepositoryCache = {};
	this.trelloMap = {
		creditsights: nconf.get('trello_boardID'),
		test_index: nconf.get('test_trello_boardID')
	};

	this.getCardRepository = function(repository) {
		if (self.cardRepositoryCache[repository] === undefined) {
			self.cardRepositoryCache[repository] = new CardRepository({index:repository});
		}
		return self.cardRepositoryCache[repository];
	}

	this.getTrelloRepository = function(board) {
		if (self.trelloRepositoryCache[board] === undefined) {
			self.trelloRepositoryCache[board] = new TrelloRepository({boardID:board});
		}
		return self.trelloRepositoryCache[board];
	};
	
	this.getBoardForRepository = function(repository) {
		return self.trelloMap[repository];
	};
};

module.exports = RepositoryCache;