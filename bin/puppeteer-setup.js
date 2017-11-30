// const harness = require('./qunit-harness');

function launchOptions(puppeteerOptions) {
  return Object.assign({
    headless: true
  }, puppeteerOptions);
};

// function harness({ page, options }) {
//     harness(page, )
// }

module.export = {
  launchOptions: launchOptions,
  // harness
}