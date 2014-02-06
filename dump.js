// Useful:
// http://localhost:9200/test_index/card/_mapping

// node dump.js --date 01/30/2014

var when = require('when');
var delay = require('when/delay');
var CardRepository = require('./cardrepository.js');

var cr = new CardRepository({index:'test_index'});


//cr.drop("test").then(process.exit);
/*
delay(
	cr
	.first(cr.queries.byScope("original scope"))
	.then(console.log),0)
.then(process.exit);
*/