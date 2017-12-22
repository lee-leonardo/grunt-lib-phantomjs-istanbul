const EventEmitter = require('events');
const ipc = require('node-ipc');
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

/*
  TODO
   - to allow this to be concurrent this id needs to be unique (i.e. add the __filename to the id!)
   - pass the id's has in a connection request and have the monitor/semaphore to allow the scripts to only fire for requests with matching hashes.
*/
/*exports default*/
class PuppeteerEventListener extends EventEmitter {
  constructor(options) {
    super();

    ipc.config.id = 'puppeteerConsumer:' + options.url;
    ipc.config.retry = 1500;
    ipc.config.maxConnections = 1;
    ipc.config.maxRetries = 5;

    this.totalTries = 0;
    this.url = options.url;
    this.grunt = options.grunt;
    this.options = options;
    this.resolve = options.resolve; //the callback from puppetmaster
    this.eventsMap = options.events || {};
  }

  // TODO rename this, spawn is pretty weird, more like connect or start... start seems to be the go to to handles the async nature...
  start() {
    console.log("puppeteer-eventEmitter start()");

    //TODO more succinct version;
    //this.connectTo('producer');
    //TODO reuse of a fn.
    // this.connectTo('producer', {
    //   "connect": () => {
    //   },
    //   "qunit.log": res => {
    //   },
    //   "qunit.error": res => {
    //   },
    //   "qunit.timeout": () => {
    //   },
    //   "error": error => {
    //   },
    //   "done": res => {
    //   },
    //   "disconnect" : () => {
    //   }
    // });

    //TODO old way
    const self = this;
    const url = this.handleProtocol() + this.url;

    ipc.connectTo('producer', () => {
      console.log("connected to producer");

      ipc.of.producer.on('connect', () => {
        console.log('established connection with puppeteer-sock'.rainbow);
        ipc.of.producer.emit('test.page', {
          url: url
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
        self.emit('fail.timeout');
      });

      // Error from puppeteer or ipc
      // Has a separate
      ipc.of.producer.on('error', error => {
        const {
          code,
          syscall
        } = error;
        if (this.options.verbose) {
          ipc.log('error: ', error);
        }

        // ENOENT fires when socket file has not been created.
        // ECONNREFUSED fires when socket file exists but is either busy or unused.
        if ((code === 'ENOENT' || code === 'ECONNREFUSED') && syscall === 'connect') {
          if (self.totalTries === 0) {
            self.emit('fail.load', self.url);
          } else {
            self.totalTries++;
          }
        }
      });

      // Clean up connection to the producer.
      ipc.of.producer.on('done', res => {
        ipc.log("finised socket based operation".log);
        ipc.disconnect('producer');

        self.emit('done', res);
        self.resolve(res.successful);

        //process.exit(0);
      });
      // This line will only happen if there is a issue on the producers end.
      ipc.of.producer.on('disconnect', () => {
        ipc.log("disconnected from connection with puppeteer-sock".notice);
      });
    });
  }

  // add a single entry to the handler
  on(eventName, handler) {
    this.eventsMap[eventName] = handler;
  }

  addEventSet(eventHandlerMapOptional) {
    const entries = Object.entries(eventHandlerMapOptional);
    const len = entries.length;

    for (let i = 0; i < len; i++) {
      const [
        eventName,
        handler
      ] = entries[i];

      this.on(eventName, handler);
    }
  }

  // name of the socket and a hash with { keys:callbacks
  connectTo(socketId, eventHandlerMapOptional) {
    this.addEventSet(eventHandlerMapOptional);

    const entries = Object.entries(this.eventsMap);
    const len = entries.length;

    ipc.connectTo(socketId, () => {
      for (let i = 0; i < len; i++) {
        const [
          event,
          handler
        ] = entries[i];

        ipc.of[socketId].on(event, handler);
      }
    });
  }

  handleProtocol() {
    console.log(`work with this: '${this.url}' to find url`);
    return "file://";
  }

  cleanup() {
    if (this.options.startProducer) {
      this.child.kill();
    }
  }

  done(isSuccessful) {
    console.log("is done!");

    this.cleanup();
    this.resolve(isSuccessful);
  }
}

module.exports = PuppeteerEventListener;