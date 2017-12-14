const { JSHandle } = require('puppeteer');
const {
  launch,
  viewport,
  consoleOpt
} = require('./puppeteer-defaults');

function launchOptions(...launcherOptions) {
  return Object.assign(launch, ...launcherOptions);
};

function viewPortOptions(...viewportOptions) {
  return Object.assign(viewport, ...viewportOptions);
}

function consoleOptions(...consoleOptions) {
  return Object.assign(consoleOpt, ...consoleOptions)
}

function generateLogger(settings) {
  return (...params) => {
    for (let i = 0; i < params.length; i++) {
      //Puppeteer ConsoleMessage object: https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-consolemessage
      const {
        type,
        text,
        args
      } = params[i];

      // Handle traces in a different way but allow the trace functionality to be overridden, defaults
      if (settings[type]) {
        const {
          handler,
          promise = settings.defaults.promise,
          options = settings.defaults.options
        } = settings[type];

        handler({ type, text }, options);
        promise({ args }, options); //TODO handle the JSON Handle Object - https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-jshandle
      } else {
        const {
          handler,
          promise,
          options
        } = settings.defaults

        handler({ type, text }, options);
        promise({ args }, options); //TODO handle the JSON Handle Object - https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-jshandle
      }
    }
  }
}

module.exports = {
  initFromArgv: function (argv) {
    //argv
    JSON.parse(cliOptString || {});
  },
  launchOptions: launchOptions,
  viewPortOptions: viewPortOptions,
  consoleOptions: consoleOptions,
  generateLogger: generateLogger
};