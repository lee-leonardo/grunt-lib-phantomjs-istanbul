module.exports = context => {
  if (context.failed) {
    var msg = "  Test Failed: " + context.name + assertionErrors.join("    ");
    testErrors.push(msg + "F");
    assertionErrors = [];
  } else {
    //TODO
  }
}