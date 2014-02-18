var u = require('./utils.js');
var nconf = require('./config.js');
var when = require('when');
var CardRepository = require('./cardrepository');
var TrelloRepository = require('./trellorepository');

var cr = new CardRepository();
var tr = new TrelloRepository();


// Get a list of indexes
function printIndexList() {
	return cr.getIndices().then(function(data) {
		console.log("Found Indices:");
		console.log(u.properties(data).map(function(i) {return "\t" + i;}).join("\n"));
	});
}

function getBoardList() {
	return tr.getBoards()
		.then(function (data) {
			console.log("Boards:");
			console.log(data.map(function(b) { return "\t[" + b.name + "]: " + b.id;}).join("\n"));
		});
}

var promise;
if (nconf.get('listBoards')) {
	promise = getBoardList();
}
else if (nconf.get('listIndices')) {
	promise = when(printIndexList());
}
else if (nconf.get('dumpFirst')) {
	// check to see if we were passed in a parameter
	if (nconf.get('dumpFirst') === true) 
		promise = when(cr.dumpFirst());
	else 
		promise = when(cr.dumpFirst(nconf.get('dumpFirst')));
}
else if (nconf.get('dumpMapping')) {
	// check to see if we were passed in a parameter
	promise = when(cr.dumpMapping(nconf.get('index'), nconf.get('mapping')));
}
else if (nconf.get('deleteIndex') !== undefined) {
	promise = when(cr.drop(nconf.get('index'))).then(function(data) {console.log("Deleted index " + nconf.get('deleteIndex'));});
}
else {
	console.log("Unrecognized action.\n\n" + 
			"Valid actions:\n" +
			"\tlistIndices\n" +
			"\tdeleteIndex\n" +
			"\tlistBoards\n" +
			"\tlistScopes\n" +
			"\tlistStatuses\n" +
			"\tdumpFirst\n" +
			"\tdumpMapping\n");
	process.exit();
}

promise
.catch(function(e){console.log("Error: " + e);})
.then(process.exit);
