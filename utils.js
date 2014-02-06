function dateAsStr(date) {
	date = date || new Date();
	var dd = date.getDate();
	var mm = date.getMonth()+1; //January is 0!
	var yyyy = date.getFullYear();
	if (dd<10) {dd='0'+dd;}
	if (mm<10) {mm='0'+mm;}
	var str = mm+'/'+dd+'/'+yyyy;
	return str;
}
function addDays(date, days) {
	var result = new Date(date);
    result.setDate(date.getDate() + days);
    return result;
}
function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function debug(obj) {
	return JSON.stringify(obj);
}

function properties(obj) {
	return Object.keys(obj);
}


exports.dateAsStr = dateAsStr;
exports.isNumber = isNumber;
exports.properties = properties;
exports.debug = debug;
exports.addDays = addDays;