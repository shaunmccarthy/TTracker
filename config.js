// Validate the config file
var nconf = require('nconf');
var Trello = require('node-trello');
nconf.argv().file({file: 'config.json'});

nconf.defaults({
    "fields" : ["labels", "desc"],
    "elastic.index": "trello",
    "elastic.type": "card"
});

function validate(key, message) {
    var value = nconf.get(key);
    if (value == undefined || value.trim() === "") {
        if (message == undefined) {
            return false;
        }
        else {
            throw new Error(message);
        }
    }
    return true;
}

validate("public_key", "You need to provide a [public_key] in your config.json file from https://trello.com/1/appKey/generate");
validate("private_key", "You need to provide a [private_key] in your config.json file from https://trello.com/1/appKey/generate");
validate("app_name", "You need to provide a [app_name] in your config.json file")
validate("token", "You need to provide a [token] in your config.json file from https://trello.com/1/connect?key=" + nconf.get("public_key") + "&name=" + nconf.get("name") + "&response_type=token");

// Now check to see if the board id has been set
if (!nconf.get('board_id')) {
    var t = new Trello(nconf.get('public_key'), nconf.get('token'));
    
    t.get("/1/members/me/boards", function(err, data) {
        var result = data.map(function(i) {
            return "\t[" + i.name + "]: " + i.id;
            });
        throw new Error("You need to provide a [board_id] in your config.json file. Valid Boards are:\n" + result.join("\n"));
    });
}



module.exports = nconf;