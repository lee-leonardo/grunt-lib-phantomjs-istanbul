/*
  Syntactic Sugar
 */
class PuppeteerConsoleLog {
  // 1:1 Interface with Puppeteer's ConsoleMessage
  constructor(
    type = "",
    text = "",
    args = []
  ) {
    this.type = type
    this.text = text
    this.args = args
  }
}
class PuppeteerConsoleError extends Error {
  constructor(
    message
  ) {
    super(message)
  }
}

//TODO need to work on this file!

function defaultLog() {
  return {
    handler(consoleMessage, options) {
      console.log(`Puppeteer Console Log:`);
      console.log(`  Type: ${consoleMessage.type}`);
      console.log(`  Arguments: ${consoleMessage.args}`);
      console.log(`  Text: ${consoleMessage.text}`);
    },
    promise(consoleMessage, options) {
      consoleMessage.args.forEach((promise) => {
        promise.then((obj) => {

          })
          .catch()

        try {


          if (options.verbose) {
            // const json = await promise.jsonValue()
            // console.log(json);
          }
        } finally {}
      });
    },
    options: {
      verbose: false
    },
  }
}

function defaultTrace() {
  return {
    handler: (consoleMessage, options) => {
      console.error(consoleMessage.text);
    },
    promise(consoleMessage, options) {
      consoleMessage.args.forEach((promise) => {
        promise.then((obj) => {

        });
        try {
          if (options.verbose) {
            // const json = await promise.jsonValue()
            // console.log(json);
          }
        } finally {}
      });
    },
    options: {
      verbose: false
    },
  }
}

module.exports = {
  consoleOpt: {
    defaults: defaultLog(),
    trace: defaultTrace()
  }
}