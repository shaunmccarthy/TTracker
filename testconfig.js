/**
 * New node file
 */
var nconf = require('nconf');
nconf.argv()
.env();
nconf.set('database:host', '127.0.0.1');
nconf.set('database:port', 5984);
nconf.set('foo', 'boo');
//
// Get the entire database object from nconf. This will output
// { host: '127.0.0.1', port: 5984 }
//
console.log('foo: ' + nconf.get('foo'));
console.log('NODE_ENV: ' + nconf.get('NODE_ENV'));
console.log('database: ' + nconf.get('database').xyas);