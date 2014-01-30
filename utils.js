function dateStamp() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!
    var yyyy = today.getFullYear();
    if (dd<10) {dd='0'+dd};
    if (mm<10) {mm='0'+mm};
    today = mm+'/'+dd+'/'+yyyy;
    return today;
}
function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
exports.dateStamp = dateStamp;
exports.isNumber = isNumber;