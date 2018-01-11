module.exports = context => {
  console.log("\n");

  if (moduleErrors.length > 0) {
    for (var idx = 0; idx < moduleErrors.length; idx++) {
      console.error(moduleErrors[idx] + "\n");
    }
  }

  var stats = [
    "Time: " + context.runtime + "ms",
    "Total: " + context.total,
    "Passed: " + context.passed,
    "Failed: " + context.failed
  ];
  console.log(stats.join(", "));

  //browser.close();

  const success = context.failed == 0;
  // ipc.server.emit(socket, 'done', {
  //   successful: success
  // });
  // process.exit(success ? 0 : 1);
}