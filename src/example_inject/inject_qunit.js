module.exports = () => {
  QUnit.config.testTimeout = 10000;

  // Cannot pass the window.harness_blah methods directly, because they are
  // automatically defined as async methods, which QUnit does not support
  QUnit.moduleDone((context) => {
    window.harness_moduleDone(context);
  });
  QUnit.testDone((context) => {
    window.harness_testDone(context);
  });
  QUnit.log((context) => {
    window.harness_log(context);
  });
  QUnit.done((context) => {
    window.harness_done(context);
  });

  console.log("\nRunning: " + JSON.stringify(QUnit.urlParams) + "\n");
}