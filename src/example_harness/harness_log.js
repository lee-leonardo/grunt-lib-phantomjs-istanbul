module.exports = context => {
  if (context.result) {
    return;
  } // If success don't log

  var msg = "\n    Assertion Failed:";
  if (context.message) {
    msg += " " + context.message;
  }

  if (context.expected) {
    msg += "\n      Expected: " + context.expected + ", Actual: " + context.actual;
  }

  console.log(msg)
}