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
  ipc.server.on('testPage', (data, socket) => {
    // var pageUrl = data.pageUrl;
    var pageUrl = "//Users/leolee/EWEGithub/epc-roomsandrates-web/src/static-content-test/scripts/ratesAndAvail/inventoryItemView_qunit.html";

    puppeteer
      .launch(launchOptions)
      .then(async browser => {
        const page = await browser.newPage();
        page.setViewport(viewportOptions);

        // Basic function to  write to the tmpfile that grunt polls against to pick up changes.
        var sendMessage = function (arg) {
          var args = Array.isArray(arg) ? arg : [].slice.call(arguments);
          ipc.server.emit(socket, 'results', JSON.stringify(args));
        };
        //TODO - need to work on making this a bit more succinct... move this code to another file?


        //TODO need to ensure that this is working properly
        // This injects the script tags to the page prior to it this is injected into the frame,
        var scripts = Array.isArray(options.inject) ? options.inject : [options.inject];
        sendMessage('inject', options.inject);
        await scripts.forEach(async script => page.addScriptTag(script)); // TODO need to test if this works...


        //This abstracts out the event handling syntax to try to make this more extensible in the future... lets see if this works.
        await harness.setupPageEvents(page, sendMessage);

        var moduleErrors = [];
        var testErrors = [];
        var assertionErrors = [];
        await harness.setupExposedMethods(page, sendMessage, moduleErrors, testErrors, assertionErrors);

        await page.goto("file://" + pageUrl);

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
        await wait(timeout);

        console.error("Tests timed out");
        browser.close();
      })
      .catch((error) => {
        ipc.serve.emit(socket, "error".error, error);

        console.error(error);
      });

  });
  ipc.server.on('socket.disconnected', (data, socket) => {
    console.log("DISCONNECTED\n\n", arguments);
    ipc.server.stop();
    process.exit(0);
  });
})

ipc.server.start();