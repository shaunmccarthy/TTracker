//var routes = require("routes.js");
var express = require('express');
var routes = require('./routes');
var nconf = require('./config.js');

var port = nconf.get('server.port');

var server = express();

// Configuration
//server.set('views', __dirname + '/client/views');
//server.engine('ejs', engine);
//server.set('view engine', 'ejs');

routes.configureRoutes(server);

server.listen(port);
console.log("Listening at http://localhost:" + port);