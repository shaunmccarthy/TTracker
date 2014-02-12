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

function getBoardList(callback) {
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
else if (nconf.get('deleteIndex') !== undefined) {
	promise = when(cr.drop(nconf.get('deleteIndex'))).then(function(data) {console.log("Deleted index " + nconf.get('deleteIndex'));});
}
else {
	console.log("Unrecognized action.\n\nValid actions:\n\tlistIndices\n\tdeleteIndex\n\tlistBoards");
	process.exit();
}

<<<<<<< HEAD
promise
.then(process.exit)
.catch(function(e){console.log("Error: " + e);});
=======
promise.then(process.exit).catch(function(e){console.log("Error: " + e); process.exit();});
>>>>>>> Moved everything in to classes
