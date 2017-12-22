#! /usr/bin/env node

const ipc = require('node-ipc');
const puppeteer = require('puppeteer');

const setup = require('./puppeteer-setup');
const args = require('./puppeteer-args').argv(process.argv, 1);

if (!args) {
  console.log("Usage: node run-qunit-chrome.js options");
  process.exit(1);
}

// TODO add support for cli not just json str
// TODO maybe use the data object to pass information rather relying on the cli too much.
// TODO maybe abstract out this into two parts?
var connected = false;
const [
  opts // puppeteer options
] = args;
const options = JSON.parse(opts || {});
const launchOptions = setup.launchOptions(options.puppeteer);
const viewportOptions = setup.viewPortOptions(options.viewport);

ipc.config.id = 'producer'; //TODO make this editable by the cli or json
ipc.config.retry = 1500;
ipc.config.maxConnections = 1;

ipc.serve(() => {
  ipc.server.on('test.page', (data, socket) => {
    connected = true;
    ipc.log("received data: ".log, data);

    //TODO data is json so we can use that to infer many types of information such as what type of testing framework and other things like what event to emit events to!

    puppeteer
      .launch(launchOptions)
      .then(async browser => {
        // Configuring logger
        const consoleOptions = setup.consoleOptions({
          log: {
            handler(consoleMessage, options) {
              console.log(consoleMessage.text);
              ipc.server.emit(socket, 'qunit.log', {
                data: consoleMessage.text
              });
            }
          },
          error: {
            handler(consoleMessage, options) {
              console.error(consoleMessage.text);
              ipc.server.emit(socket, 'qunit.error', {
                error: consoleMessage.text
              });
            }
          }
        }, options.console);

        // Setup
        const page = await browser.newPage();
        var moduleErrors = [];
        var testErrors = [];
        var assertionErrors = [];

        await page.on('console', setup.generateLogger(consoleOptions));

        if (options.expose) {
          let entries = Object.entries(options.expose);
          let len = entries.length;
          for (let i = 0; i < len; i++) {
            let [
              fnName, // the function will be exposed on the window object
              fnPath // the path will be where node will pick up the fn and stick into the window obj
            ] = entries[i]

            await page.exposeFunction(domName, require(fnPath))
          }
        }

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
            testErrors.push(msg + "F");
            assertionErrors = [];
          } else {
            //TODO
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

          const success = context.failed == 0;
          ipc.server.emit(socket, 'done', {
            successful: success
          });
          process.exit(success ? 0 : 1);
        });

        await page.goto(data.url);
        /*
          options.inject {
            //Doc: https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageaddscripttagoptions
            script: { url, path, content },
            //Doc: https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageaddstyletagoptions
            style: { url, path, content }
          }
        */
        if (options.inject) {
          if (options.inject.script) {
            if (Array.isArray(options.test.script)) {
              let len = options.test.script.length;
              for (let i = 0; i < len; i++) {
                await page.addScriptTag(options.test.script[i]);
              }
            } else {
              await page.addScriptTag(options.test.script);
            }
          }
          if (options.inject.style) {
            if (Array.isArray(options.test.script)) {
              let len = options.test.script.length;
              for (let i = 0; i < len; i++) {
                await page.addStyleTag(options.test.style[i]);
              }
            } else {
              await page.addStyleTag(options.test.style);
            }
          }
        }

        /*
          // Result will emit to the key.
          options.evaluate: {
            //Doc: https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageevaluatepagefunction-args
            key: { pageFunction, ..args }
          }
        */
        if (options.evaluate) {
          if (options.evaluate.script) {
            const entries = Object.entries(script);
            let i = 0;
            const len = entries.length;
            for (let i = 0; i < len; i++) {
              const [
                eventName,
                fn
              ] = entries[i];

              const result = await page.evaluate(fn);
              ipc.emit(key, {
                result: JSON.parse(result)
              });
            }
          }
        }

        //TODO...
        if (options.runner) {
          await page.evaluate(options.runner.script);
        }

        /*
          // Work on three different options:
            1. an array that is a string represenation of a function for Function() emit result to test
            2. emit to grunt to test.
            3. a script that can be injected into the dom, this resolves itself
            4. a script that will evaluate based on a specific context
        */
        //TODO rm
        // await page.evaluate(() => {
        //   QUnit.config.testTimeout = 10000;

        //   // Cannot pass the window.harness_blah methods directly, because they are
        //   // automatically defined as async methods, which QUnit does not support
        //   QUnit.moduleDone((context) => {
        //     window.harness_moduleDone(context);
        //   });
        //   QUnit.testDone((context) => {
        //     window.harness_testDone(context);
        //   });
        //   QUnit.log((context) => {
        //     window.harness_log(context);
        //   });
        //   QUnit.done((context) => {
        //     window.harness_done(context);
        //   });

        //   console.log("\nRunning: " + JSON.stringify(QUnit.urlParams) + "\n");
        // });

        function wait(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
        await wait(ipc.config.retry);

        console.error("Tests timed out");
        ipc.server.emit(socket, 'qunit.timeout');
        browser.close();
      })
      .catch(err => {
        ipc.server.emit(socket, 'error', err);
        process.exit(1);
      });
  });
  ipc.server.on('test.end', (data, socket) => {
    ipc.server.stop();
    process.exit(0);
  });
  ipc.server.on('socket.disconnected', (data, socket) => {
    ipc.log("DISCONNECTED\n\n");

    //TODO this needs to be moved.
    ipc.server.stop();
    process.exit(0);
  });
})

ipc.server.start();

//TODO is this necessary if I fixed this?
setTimeout(() => {
  if (!connected) {
    ipc.log("stopping server due to lack of connection");
    ipc.server.stop();
    process.exit(0);
  }
}, 10000);