const ipc = require('node-ipc');
const path = require('path');

ipc.config.id = 'consumer';
ipc.config.retry = 1000;
ipc.config.silent = true;
ipc.config.maxRetries = 5;
ipc.config.maxConnections = 1;

//TODO this is test data...
const abs = path.resolve()
const exposePath = (name) => `${abs}/src/example_harness/${name}.js`
var json = {
  url: "file:///Users/leolee/EWEGithub/epc-roomsandrates-web/src/static-content-test/scripts/ratesAndAvail/inventoryItemView_qunit.html",
  expose: {
    harness_done: exposePath("harness_done"),
    harness_log: exposePath("harness_log"),
    harness_moduleDone: exposePath("harness_moduleDone"),
    harness_testDone: exposePath("harness_testDone")
  },
  inject: {
    script: [abs + '/src/example_inject/inject_qunit.js']
  }
};

ipc.connectTo('producer', () => {
  ipc.of.producer.on('connect', () => { //was 'connect'
    console.log('established connection with puppeteer-sock'.rainbow);
    ipc.of.producer.emit('test.page', json);
  });
  //Console Logs
  ipc.of.producer.on('console', res => {
    console.log(res);
  });
  // Error from puppeteer or ipc
  ipc.of.producer.on('error', (error) => {
    ipc.log('error: ', error);
    ipc.log('stack: ', error.stack);
  });
  ipc.of.producer.on('test.timeout', () => {
    ipc.log("finised socket based operation".log);
    ipc.disconnect('producer');

    process.exit(0);
  });
  ipc.of.producer.on('disconnect', () => {
    ipc.log("disconnected from connection with puppeteer-sock".notice);
  });
});