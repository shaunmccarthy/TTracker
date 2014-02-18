// Validate the config file
var nconf = require('nconf');
var Trello = require('node-trello');
nconf.argv().file({file: 'config.json'});

nconf.defaults({
	"trello_fields" : ["labels", "desc"],
	"elastic_index": "trello",
	"elastic_type": "card"
});

function validate(key, message) {
	var value = nconf.get(key);
	if (value === undefined || value.trim() === "") {
		if (message === undefined) {
			return false;
		}
		else {
			throw new Error(message);
		}
	}
	return true;
}

validate("trello_publicKey", "You need to provide a [trello_publicKey] in your config.json file from https://trello.com/1/appKey/generate");
validate("trello_privateKey", "You need to provide a [trello_privateKey] in your config.json file from https://trello.com/1/appKey/generate");
validate("trello_appName", "You need to provide a [trello_appName] in your config.json file");
validate("trello_token", "You need to provide a [trello_token] in your config.json file from https://trello.com/1/connect?key=" + nconf.get("public_key") + "&name=" + nconf.get("name") + "&response_type=token");
validate("server_port", "You need to provide a port for the webserver to list on");

module.exports = nconf;