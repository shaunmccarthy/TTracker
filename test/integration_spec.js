var should = require('should');
var u = require('../utils.js');
var nconf = require('../config.js');
var when = require('when');
var delay = require('when/delay');

var TrelloRepository = require('../trellorepository');
var CardRepository = require('../cardrepository.js');

var cr = new CardRepository({index:nconf.get('test.elastic.index')});
var tr = new TrelloRepository({boardID: nconf.get('test.trello.board_id')});

// Create the scenario

describe('Integration Tests - Trello', function() {

});