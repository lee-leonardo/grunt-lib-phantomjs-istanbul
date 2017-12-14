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

const producer = require('puppeteer-producer');

/*
  TODO
   - to allow this to be concurrent this id needs to be unique (i.e. add the __filename to the id!)
   - pass the id's has in a connection request and have the monitor/semaphore to allow the scripts to only fire for requests with matching hashes.
*/
module.exports.init = class PuppeteerEventListener extends EventEmitter {
  constructor({
    grunt,
    options,
    resolveCallback
  }) {
    super();

    const {
      url = "/Users/leolee/EWEGithub/epc-roomsandrates-web/src/static-content-test/scripts/ratesAndAvail/inventoryItemView_qunit.html"
    } = options;

    ipc.config.id = 'puppeteerConsumer:' + url;
    ipc.config.retry = 1500;
    ipc.config.maxConnections = 1;

    this.url = url;
    this.grunt = grunt; //Ehh, going to see if there's a better pattern.
    this.options = options;
    this.resolve = resolveCallback; // thread is kept awake until this resolves. -> TODO kill this code when timeout is reached.
  }

  spawn() {
    // TODO queue up the producer to fire
    // TODO: grunt.util.spawn

    ipc.connectTo('producer', () => {
      ipc.of.producer.on('connect', () => {
        console.log('established connection with puppeteer-sock'.rainbow);
        ipc.of.producer.emit('test.page', {
          url: this.url
        });
      });

      //TODO need to setup emissions that pertain to logging into the console.
      //Error from qunit
      ipc.of.producer.on('qunit.log', res => {
        console.log(res.data);
      });

      //TODO emit debug

      //Error from qunit
      ipc.of.producer.on('qunit.error', res => {
        console.log(res.error);
      });

      ipc.of.producer.on('qunit.timeout', () => {
        //Handle Time Out
        this.emit('fail.timeout');
      });

      // Error from puppeteer or ipc
      ipc.of.producer.on('error', error => {
        ipc.log('error: ', error);
        ipc.log('stack: ', error.stack);
        this.emit('fail.load', this.url);
      });

      // Clean up connection to the producer.
      ipc.of.producer.on('done', res => {
        ipc.log("finised socket based operation".log);
        ipc.disconnect('producer');

        this.emit('done', res);
        this.resolve(res.successful);

        process.exit(0);
      });
      // This line will only happen if there is a issue on the producers end.
      ipc.of.producer.on('disconnect', () => {
        ipc.log("disconnected from connection with puppeteer-sock".notice);
      });
    });
  }

  cleanup() {}

  done(isSuccessful) {
    this.cleanup();
    this.resolve(isSuccessful);
  }
};
