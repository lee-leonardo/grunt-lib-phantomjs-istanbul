module.exports = context => {
  if (context.failed) {
    var msg = "Module Failed: " + context.name + "\n" + testErrors.join("\n");
    moduleErrors.push(msg);
    testErrors = [];
  }
}