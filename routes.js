var express = require('express');

var configureRoutes = function configureRoutes(server) {
	server.get('/', function(req, res) {
		// Pipe a file to the output stream
		res.sendfile("client/index.html");
	});
	server.use(express.static(__dirname + '/client'));
};

exports.configureRoutes = configureRoutes;
