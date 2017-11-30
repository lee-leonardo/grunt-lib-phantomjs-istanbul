// const harness = require('./qunit-harness');

function launchOptions(puppeteerOptions) {
  const defaults = {
    headless: true,   // the default
    timeout: 10000,   // the original default is 30,000 i.e. 30 seconds
    dumpio: true,     // allows for grunt to 'talk to it'
  };

  return Object.assign(defaults, puppeteerOptions);
};

module.exports = {
  launchOptions: launchOptions
};