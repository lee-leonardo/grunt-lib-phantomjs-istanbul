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

ipc.config.id = 'producer'; //TODO make this editable by the cli or json
ipc.config.retry = 1500;
ipc.config.maxConnections = 1;

ipc.serve(() => {
  ipc.server.on('test.page', (data, socket) => {
    connected = true;
    ipc.log("received data: ".log, data);

    // Configurations, from cli/json from startup and json from the test
    const launchOptions = setup.launchOptions(options.puppeteer, data.launch);
    const viewportOptions = setup.viewPortOptions(options.viewport, data.viewport);
    const consoleOptions = setup.consoleOptions(options.console, data.console);

    puppeteer
      .launch(launchOptions)
      .then(async browser => {
        // Setup
        const page = await browser.newPage();
        var moduleErrors = [];
        var testErrors = [];
        var assertionErrors = [];

        ipc.server.emit(socket, "console.log", {
          type: 'log',
          text: 'wtf',
          args: []
        });

        await page.on('console', setup.generateLogger({
          settings: consoleOptions,
          ipc,
          socket
        }));

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

        /* TODO -> help out with developing the evaluate section a bit more... all fn need to be paths to functions.
          // Work on three different options:
            1. an array that is a string represenation of a function for Function() emit result to test
            2. emit to grunt to test.
            3. a script that can be injected into the dom, this resolves itself
            4. a script that will evaluate based on a specific context
        */
        /*
          // Result will emit to the key.
          options.evaluate: {
            //Doc: https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageevaluatepagefunction-args
            key: { pageFunction, ..args }
          }
        */
        if (options.evaluate) {
          ipc.emit(socket, 'error', Error("This is TBD"))

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

        function wait(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
        await wait(ipc.config.retry);

        console.error("Tests timed out");
        ipc.server.emit(socket, 'test.timeout');
        browser.close();
      })
      .catch(err => {
        ipc.server.emit(socket, 'error', err);
        process.exit(1);
      });
  });
  //TODO this might not be necessary until we need a semaphore version.
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