#! /usr/bin/env node

console.log("console log output");

const path = require('path');
const puppeteer = require('puppeteer');
const setup = require('./puppeteer-setup');

const args = process.argv.slice(2);

if (args.length < 1 || args.length > 4) {
  console.log("Usage: node run-qunit-chrome.js <URL> <timeout>");
  process.exit(1);
}

const [
  handleScript,
  tempFilePath,
  pageUrl,
  options
] = args;

(async() => {
  // const browser = await puppeteer.launch(setup.launchOptions(options.puppeteer));
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  //TODO - use the handleScript
  // await setup.harness(page);

  // Attach to browser console log events, and log to node console
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
      process.stdout.write("F");
    } else {
      process.stdout.write(".");
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
      process.exit(1);
    } else {
      process.exit();
    }
  });


  //TODO ----------------------------------

  console.log(pageUrl);



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
  process.exit(124);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});










//TODO - the stuff from before, i.e. cannibalize


// //TODO - phantomjs
// var path = require('path')
// var spawn = require('child_process').spawn

// var binPath = require(path.join(__dirname, '..', 'lib', 'phantomjs')).path

// var args = process.argv.slice(2)

// // For Node 0.6 compatibility, pipe the streams manually, instead of using
// // `{ stdio: 'inherit' }`.
// var cp = spawn(binPath, args)
// cp.stdout.pipe(process.stdout)
// cp.stderr.pipe(process.stderr)
// process.stdin.pipe(cp.stdin)

// cp.on('error', function (err) {
//   console.error('Error executing phantom at', binPath)
//   console.error(err.stack)
// })

// cp.on('exit', function (code) {
//   // Wait few ms for error to be printed.
//   setTimeout(function () {
//     process.exit(code)
//   }, 20)
// });

// process.on('SIGTERM', function () {
//   cp.kill('SIGTERM')
//   process.exit(1)
// })
