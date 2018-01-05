const {
  launch,
  viewport
} = require('./puppeteer-defaults');
const {
  consoleOpt,
  PuppeteerConsoleLog,
  PuppeteerConsoleError
} = require('./puppeteer-console');

// get values
// remove inject and evaluate
// iterate and assign
// handle inject and evaluate for their
function handleOptions(options, data) {
  const options = JSON.parse(opts || {});
  const entries = Object.entries(options);


  const launchOptions = setup.launchOptions(options.puppeteer, data.launch);
  const viewportOptions = setup.viewPortOptions(options.viewport, data.viewport);
  const consoleOptions = setup.consoleOptions(options.console, data.console);

  return options
}

/*
  generateLogger({ logType : handlerFunction }})
  - Logger generator resolves most use cases of the logger.
  - Essentially the output of the logger is passed back as json to the receiving socket.
  - Puppeteer's api upon the console is here: https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-consolemessage
  - For additional information on the handler object https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-jshandle
  - Use https://developer.mozilla.org/en-US/docs/Tools/Web_Console to understand how this logging works in more detail.

  Gotchas:
  - The JSHandle@<type> is an object that is a Promise that can be handled in multiple ways. To use this

  pseudocode
    for each console message object

 */
/*
  ConsoleMessage
    - https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-consolemessage
    - type: string: the type of logger
    - text: string: the string representation of the object, non-primitives are marcated as JSHandle@<type>
    - args: [JSHandle<object>]: a object that holds Promises to retrieve each individual argument from the context

  JSHandle
    - https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-jshandle
    - contains functions that resolve promises that take a function may use the documents context
  */
function generateLogger({
  settings,
  ipc,
  socket
}) {
  ipc.server.emit(socket, "console", { type: 'log', text: "testing testing", args: [{a:1,b:true}] });

  return (...params) => {
    return Promise.all(
      // If json, resolve json before passing, if string pass string
      params.map(param => {
        return new Promise((resolve, reject) => {
          if (param.text.includes("JSHandle")) {
            Promise.all(param.args.map(promise => promise.jsonValue()))
              .then(args => {
                return resolve(
                  new PuppeteerConsoleLog({
                    type: param.type,
                    text: param.text,
                    args: args
                  })
                )
              })
              .catch(err => {
                return reject(Error("Puppeteer Logger Error: unable to resolve: " + text))
              })
          } else {
            return resolve(
              new PuppeteerConsoleLog({
                type: param.type,
                text: param.text
              })
            )
          }
        })
      })
    ).then(params => {
      // Handle the event emission by type
      params.map(param => {
        const {
          type, // logger types such as: log | error | warn | etc.
        } = param;

        ipc.server.emit(socket, `console`, param)

        //TODO this isn't complete yet for other than the default logger.
        // if (settings[type]) {
        //   // Handle traces in a different way but allow the trace functionality to be overridden, defaults
        //   const {
        //     handler = settings.defaults.handler,
        //     options = settings.defaults.options
        //   } = settings[type];
        //   return handler({
        //     param,
        //     options,
        //     ipc,
        //     socket
        //   })
        // } else {
        //   ipc.server.emit(socket, `console`, param)
        // }
      })
    }).catch(err => ipc.server.emit(socket, 'error', err));
  }
}

module.exports = {
  initFromArgv: function (argv) {
    JSON.parse(cliOptString || {});
  },
  handleOptions: handleOptions,
  generateLogger: generateLogger
};
