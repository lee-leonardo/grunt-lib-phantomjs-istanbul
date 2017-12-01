function launchOptions(launcherOptions) {
  const defaults = {
    headless: true,   // the default
    timeout: 10000,   // the original default is 30,000 i.e. 30 seconds
    dumpio: true,     // allows for grunt to 'talk to it'
  };

  return Object.assign(defaults, launcherOptions);
};

function viewPortOptions(viewportOptions) {
  const defaults = {

  };

  return Object.assign(defaults, viewportOptions);
}

module.exports = {
  launchOptions: launchOptions,
  viewPortOptions: viewPortOptions
};