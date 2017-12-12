const ipc = require('node-ipc');
const puppeteer = require('puppeteer');

const setup = require('./puppeteer-setup');
const args = require('./puppeteer-args').argv(process.argv, 1);
const harness = require('./qunit-harness');

if (!args) {
  console.log("Usage: node run-qunit-chrome.js options");
  process.exit(1);
}

const [
  opts // puppeteer options
] = args;
const options = JSON.parse(opts || {});
const launchOptions = setup.launchOptions(options.puppeteer);
const viewportOptions = setup.viewPortOptions(options.viewport);

ipc.config.id = 'producer';
ipc.config.retry = 1500;
ipc.config.maxConnections = 1;

ipc.serve(() => {
  ipc.server.on('test.page', (data, socket) => {
    puppeteer
      .launch({
        headless: true,
        timeout: 10000,
        dumpio: true
      })
      // Setup
      .then(async browser => {
        const page = await browser.newPage();
        var moduleErrors = [];
        var testErrors = [];
        var assertionErrors = [];

        //setup code
        function message(msg) {
          //ipc.log(msg);
          // console.log(msg);
          ipc.server.emit(socket, 'result', {
            data: msg
          });
        }

        await page.on('console', (...params) => {
          for (let i = 0; i < params.length; ++i)
            console.log(`${params[i]}`);
        });

        var moduleErrors = [];
        var testErrors = [];
        var assertionErrors = [];

        await page.exposeFunction('harness_moduleDone', context => {
          if (context.failed) {
            var msg = "Module Failed: " + context.name + "\n" + testErrors.join("\n");
            moduleErrors.push(msg);
            testErrors = [];
          }
        });

        await page.exposeFunction('harness_testDone', context => {
          if (context.failed) {
            var msg = "  Test Failed: " + context.name + assertionErrors.join("    ");
            testErrors.push(msg);
            assertionErrors = [];
            message("F");
            // process.stdout.write("F");
          } else {
            message(".");
            // process.stdout.write(".");
          }
        });

        await page.exposeFunction('harness_log', context => {
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

          assertionErrors.push(msg);
        });

        await page.exposeFunction('harness_done', context => {
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

          browser.close();
          if (context.failed > 0) {
            ipc.server.emit(socket, 'finish', {
              data: {
                successful: false
              }
            });
          } else {
            ipc.server.emit(socket, 'finish', {
              data: {
                successful: true
              }
            });
          }
        });

        await page.goto('file://' + data.url);

        await page.evaluate(() => {
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
        });

        function wait(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
        await wait(ipc.config.retry);

        console.error("Tests timed out");
        browser.close();
        ipc.server.emit(socket, 'finish', {
          data: {
            successful: moduleErrors.length === 0 && testErrors.length === 0 && assertionErrors.length === 0
          }
        });
      })
      .catch(err => {
        ipc.server.emit(socket, 'error', err);
        process.exit(1);
      });
  });
  ipc.server.on('socket.disconnected', (data, socket) => {
    ipc.log("DISCONNECTED\n\n");
    //ipc.log(data);
    ipc.server.stop();
    process.exit(0);
  });
})

ipc.server.start();