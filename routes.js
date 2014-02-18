var express = require('express');

var u = require('./utils.js');
var nconf = require('./config.js');
var when = require('when');
var RepositoryCache = require('./repositorycache.js');
var cache = new RepositoryCache();

var configureRoutes = function configureRoutes(server) {
	server.get('/', function(req, res) {
		// Pipe a file to the output stream
		res.sendfile("client/index.html");
	});

	// http://localhost:1983/trello/test_stats/status
	server.get('/trello/:repository/:query', function (req, res) {
		var repository = req.params["repository"];
		var query = req.params["query"];
		
		var cr = cache.getCardRepository(repository);
		var tr = cache.getTrelloRepository(cache.getBoardForRepository(repository));
		
		var result;
		
		if (query === "status")
			result = tr.populateLists().then(function(statuses) {
				return cr.estimateByFieldValues("listID", statuses.map(function(status) { return status.id; }), tr.listLookup());
			});
		
		if (query === "scope")
			result = tr.populateLabels().then(function(labels) {
				return cr.estimateByFieldValues("colors", labels.map(function(label) { return label.id; }), tr.labelLookup());
			});
		
		result
		.then(function(data) { res.send(data); })
		.catch(function (err) { res.send("Ouch: " + err); });
	});

	server.use(express.static(__dirname + '/client'));
};

exports.configureRoutes = configureRoutes;
