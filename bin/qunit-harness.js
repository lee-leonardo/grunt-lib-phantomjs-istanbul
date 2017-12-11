const puppeteer = require('puppeteer');

const setup = require('./puppeteer-setup');

async function setupPageEvents(page, sendMessage) {
  // Attach to browser console log events, and log to node console
  await page.on('console', (...params) => {
    for (let i = 0; i < params.length; ++i) {
      console.log(`${params[i].text}`);
      sendMessage('console', params[i]); //TODO should I only log 'log' level
    }
    //Logs everything here indiscriminately, , the params object is constructed as such:
    /*
      ConsoleMessage(
        type: 'log' | 'error' | etc,
        text: 'the outpur of the console message'
        args: 'a list of the arguments'
      )
    */
  });

  await page.on('error', err => {
    console.error(err);
    console.error(err.stack);
    sendMessage('error.onError', err, err.stack, "node error"); // this logs an error thrown by node.
  });

  await page.on('pageerror', err => {
    sendMessage('error.onError', err);
  });

  await page.on('request', req => {
    sendMessage('requestIssued', req);
    //TODO - this is a really messy bit of code... will have to determine the best solution at a later point.
  });

  await page.on('requestfailed', req => {
    sendMessage('resourceFailed', req);
  });

  await page.on('requestfinished', req => {
    sendMessage('resourceFinished', req);
  });

  await page.on('response', res => {
    sendMessage('responseReceived', res);
  });
}

async function setupExposedMethods(page, sendMessage, moduleErrors, testErrors, assertionErrors) {
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
      process.stdout.write("F");
      sendMessage('F');
    } else {
      process.stdout.write(".");
      sendMessage('.');
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
    sendMessage(msg);
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
      ipc.server.emit(socket, 'finish');
      process.exit(1);
    } else {
      ipc.server.emit(socket, 'finish');
      process.exit();
    }
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// returns a page promise
async function harness(page, msgFn) {

}

module.exports = {
  setupPageEvents: setupPageEvents,
  setupExposedMethods: setupExposedMethods,
  init: function init(pageOptions, msgFn) {
    return {
      harness: harness
    }
  }
}