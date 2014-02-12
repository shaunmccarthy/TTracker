// Validate the config file
var nconf = require('nconf');
var Trello = require('node-trello');
nconf.argv().file({file: 'config.json'});

nconf.defaults({
	"trello.fields" : ["labels", "desc"],
	"elastic.index": "trello",
	"elastic.type": "card"
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

validate("trello.public_key", "You need to provide a [public_key] in your config.json file from https://trello.com/1/appKey/generate");
validate("trello.private_key", "You need to provide a [private_key] in your config.json file from https://trello.com/1/appKey/generate");
validate("trello.app_name", "You need to provide a [app_name] in your config.json file");
validate("trello.token", "You need to provide a [token] in your config.json file from https://trello.com/1/connect?key=" + nconf.get("public_key") + "&name=" + nconf.get("name") + "&response_type=token");

module.exports = nconf;