module.exports = {
  launch: {
    headless: true, // the default
    timeout: 10000, // the original default is 30,000 i.e. 30 seconds
    dumpio: false, // allows for grunt to 'talk to it'
  },
  viewport: {},
  consoleOpt: {
    defaults: {
      handler: (consoleMessage, options) => {
        console.log(`Puppeteer Console Log:`);
        console.log(`  Type: ${consoleMessage.type}`);
        console.log(`  Arguments: ${consoleMessage.args}`);
        console.log(`  Text: ${consoleMessage.text}`);
      },
      options: {}
    },
    trace: {
      handler: (consoleMessage, options) => {
        console.error(consoleMessage.text);
      },
      options: {}
    }
  }
}