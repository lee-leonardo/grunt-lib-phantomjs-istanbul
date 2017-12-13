/*
  Steps:
  1. setup the event emitter syntax (using node events rather than 3rd party) and harmonize it with puppeteer consumer
     - create two spawn calls, one for the producer, one for the consumer.
  2. ensure failures are being signaled correctly
  3. events:
      - log event, to log all the rudimentary logs
      - log the done handler to determine if test succeed or fail.
  4. publish and integrate into the two levels of plugins.
  5. Post work:
     - add verbose logging support for debugging.
     - add code to allow for scripting logging and other things.
     - move out puppeteer code into it's own repository.
     - create monitoring logic so that tests can be run in parallel
*/

const EventEmitter = require('events');

const ipc = require('node-ipc');
ipc.config.id = 'consumer';
ipc.config.retry = 1500;
ipc.config.maxConnections = 1;

module.exports.init = class PuppeteerEventListener {
  constructor({
    grunt,
    options,
    resolveCallback
  }) {
    this.resolve = resolveCb; // thread is kept awake until this resolves. -> TODO kill this code when timeout is reached.
    this.emitter = new EventEmitter();

    ipc.connectTo('producer', () => {
      ipc.of.producer.on('connect', () => {
        console.log('established connection with puppeteer-sock'.rainbow);
        ipc.of.producer.emit('test.page', json);
      });
      //Error from qunit
      ipc.of.producer.on('qunit.log', res => {
        console.log(res.data);
      });
      //Error from qunit
      ipc.of.producer.on('qunit.error', res => {
        console.log(res.error);
      });
      // Error from puppeteer or ipc
      ipc.of.producer.on('error', error => {
        ipc.log('error: ', error);
        ipc.log('stack: ', error.stack);
      });
      ipc.of.producer.on('done', res => {
        ipc.log("finised socket based operation".log);
        ipc.disconnect('producer');

        this.done(res.successful);

        process.exit(0);
      });
      // This line will only happen if there is a issue on the producers end.
      ipc.of.producer.on('disconnect', () => {
        ipc.log("disconnected from connection with puppeteer-sock".notice);
      });
    });
  }

  cleanup() {

  }

  done(isSuccessful) {
    this.cleanup();
    this.resolve(isSuccessful);
  }
}