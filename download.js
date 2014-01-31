// This file connects to trello and downloads all the details
// from cards on the board and stores them in a file

var utils = require('./utils.js');
var Trello = require('node-trello');
var ElasticSearch = require('elasticsearch');
var nconf = require('./config.js');
var when = require('when');

var trello = new Trello(nconf.get('public_key'), nconf.get('token'));
var es = new ElasticSearch.Client();

// Returns the estimate for a card based on the title
var estimatePattern = new RegExp("^\\(([0-9\\.]+)\\).*");
function getEstimate(title) {
    var match = estimatePattern.exec(title);
    if (match != undefined && utils.isNumber(match[1])) {
        return parseFloat(match[1]);
    } else {
        return undefined;
    }
}

function saveCards(cards) {
    var toSave = cards.length;
    var saved = 0;
    console.log("Saving " + toSave + " cards");
    
    
    // Now save the cards to elastic search
    // TODO: Batch
    var promises = cards.map(function (c) {
        var doc = {
            index: nconf.get('elastic.index'),
            type: nconf.get('elastic.type'),
            id: c.id + c.reportDate,
            body: c   
        };
        
        return es.index(doc).then(function(res)
                                  {
                                    console.log("Saved " + c.id)
                                  });
    });

    return when.all(promises);
}

function getCards(trello) {
    var cards = [];
    // Lowercase the config / trim it
    var fields = nconf.get("fields").map(function (str) {return str.toLowerCase().trim() });
    
    // Make sure name is in there, since we'll need it for estimates
    if (fields.indexOf("name") === -1) {
        fields[fields.length] = "name";
    }
    
    var date = utils.dateStamp();

    // get all the cards for the board
    return when.promise(function (resolve, reject) {
        trello.get("/1/boards/"+ nconf.get("board_id") + "/lists?cards=open&card_fields=" + fields.join(',') + "&labels=true", function(err, data) {
            (err != undefined) ? reject(err) : resolve(data);
        })
    })
    .then(function(data) {
        var result = data.map(function(l) {
            var list = l.name;
            var listID = l.id;
            l.cards.map( function(c) {
                
                // Set the estimate
                c.estimate = getEstimate(c.name);
                
                // Set the list
                c.listID = listID;
                c.list = list;
                
                // Parse the labels
                if (c.labels !== undefined) {
                    c.colors = c.labels.map(function(l) { return l.color; });
                    c.labels = c.labels.map(function(l) { return l.name; });
                }
                // Set the report date
                c.reportDate = date;
                
                cards[cards.length] = c;
            });
        });
        return cards;
    });
}


getCards(trello)
.then(saveCards)
.then(process.exit);
