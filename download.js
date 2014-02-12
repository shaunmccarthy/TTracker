// This file connects to trello and downloads all the details
// from cards on the board and stores them in a file

var nconf = require('./config.js');
var when = require('when');
var CardRepository = require('./cardrepository');
var TrelloRepository = require('./trellorepository');

var cr = new CardRepository();
var tr = new TrelloRepository();

console.log("Updating cards for " + tr.boardID);
tr.getCards()
.then(function(data) { console.log("Found " + data.length + " cards"); return data;})
.then(function(data) { return cr.saveCards(data); })
.then(function(data) { console.log("Saved " + data.length + " cards");})
.then(process.exit)
.catch(function(err) { console.log("Error: " + err);});
