var TrelloRepository = require('../trellorepository');
var should = require('should');
var tr = new TrelloRepository();


describe('Unit Tests - Trello Repository', function() {
	it ("should handle no estimate in the input", function() {
		var output = tr.getEstimate("No Estimate here");
		should.not.exist(output);
	});
	it ("should handle parenthesis not at the start of the input", function() {
		var output = tr.getEstimate("No Estimate here (17)");
		should.not.exist(output);
	});
	it ("should handle empty parenthesis at the start", function() {
		var output = tr.getEstimate("() No Estimate here ");
		should.not.exist(output);
	});
	it ("should handle text parenthesis at the start", function() {
		var output = tr.getEstimate("(what) No Estimate here ");
		should.not.exist(output);
	});
	it ("should handle text and number parenthesis at the start", function() {
		var output = tr.getEstimate("(what12) No Estimate here ");
		should.not.exist(output);
	});
	it ("should handle a decimal number in paranthesis at the start", function() {
		var output = tr.getEstimate("(1.2) No Estimate here ");
		should(output).equal(1.2);
	});
	it ("should handle a single digit number in paranthesis at the start", function() {
		var output = tr.getEstimate("(1) No Estimate here ");
		should(output).equal(1);
	});
	it ("should handle a two digit number in paranthesis at the start", function() {
		var output = tr.getEstimate("(12) No Estimate here ");
		should(output).equal(12);
	});
});