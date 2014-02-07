var u = require('./utils.js');
var ElasticSearch = require('elasticsearch');
var nconf = require('./config.js');
var es = new ElasticSearch.Client();
var Trello = require('node-trello');
var trello = new Trello(nconf.get('public_key'), nconf.get('token'));
var when = require('when');

// Get a list of indexes
function printIndexList() {
	return es.indices.getAliases({}).then(function(data) {
		console.log("Found Indices:");
		console.log(u.properties(data).map(function(i) {return "\t" + i;}).join("\n"));
	});
}

function getBoardList(callback) {
	return when.promise(function (resolve, reject) {
		trello.get("/1/members/me/boards", function (err, data) {
			if (err) reject(err); else resolve(data);
		});
	}).then(function (data) {
		console.log("Boards:");
		console.log(data.map(function(b) { return "\t[" + b.name + "]: " + b.id;}).join("\n"));
	});
}

function deleteIndex(index) {
	return es.indices.delete({index: index}).then(function(data) {
		console.log("Deleted index " + index);
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
	promise = when(deleteIndex(nconf.get('deleteIndex')));
}
else {
	console.log("Unrecognized action.\n\nValid actions:\n\tlistIndices\n\tdeleteIndex\n\tlistBoards");
	process.exit();
}

promise
.then(process.exit)
.catch(function(e){console.log("Error: " + e);});
