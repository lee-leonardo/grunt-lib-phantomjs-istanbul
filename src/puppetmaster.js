const fs = require('fs')
const {
    spawn
} = require('child_process')
const PuppeteerEventListener = require('./puppeteer-eventEmitter');

//The gruntfile code that launches and manages the instances
export default class PuppetMaster {
    constructor(options) {
        const self = this;
        //TODO add path
        // object || defaults
        options = options || {}

        //TODO need to sanitize the urls up here... need to revise this ish.
        options.url = 'file://' + options.url;


        this.resolve = options.resolve || function () { self.puppeteer.kill(); }

        this.puppeteer = undefined;
        this.listener = undefined;

    }

    // listen to the basic events.
    events(logger) {

    }

    // event name is a string, the function call in the window. the callback will pass the json object.
    listenOn(eventName, callback) {
        this.listener.on(eventName, callback);
    }

    //TODO this is the function that fires off the event sequence that spawn everythign.
    // this starts the listener and starts execution.
    start() {
        this.listener.spawn();
    }

    init() {
        var self = this;
        return self.exists()
            .then(() => self.spawnProducer) // spawn the producer first, when it is fully online ~1.5s
            .then(() => self.spawnListener) // then spawn the emitter and sync it
            .then(() => self) // the listener handles all events
    }

    exists() {
        var self = this
        return new Promise((resolve, reject) => {
            if (self.debuggerAddress) resolve()

            if (typeof self.path !== 'string') {
                return reject(Error('Application path must be a string'))
            }

            // go forward if
            fs.stat(self.path, (err, stat) => {
                if (err) return reject(err)
                if (stat.isFile()) return resolve()
                reject(Error(`Application path specified is not a file: ${self.path}`))
            })
        })
    }

    spawnProducer() {
        if (this.puppeteer) throw new Error("Puppeteer already started");

        this.puppeteer = require('child_process').spawn('node', ['./bin/puppeteer-producer.js', '{}'], {
            stdio: ['ignore', 'inherit', 'ignore'],
            // detached: true
        });

        var self = this
        this.exitHandler = () => self.done()
        global.process.on('exit', this.exitHandler);

        this.setup()
        return this.waitUntilRunning();
    }

    spawnListener() {
        if (this.listener) throw new Error("EventEmitter is already started");

        //TODO add all the ish here!

        this.listener = new PuppeteerEventListener({

        });

        this.listener
        //TODO setup the event emitter.
        //TODO add a cusomizable interface to this.
    }

    setup() {}

    waitUntilRunning() {
        const self = this;
        return new Promise((resolve, reject) => {
            var startTime = Date.now();
            var check = (running => {
                if (!self.puppeteer) {
                    return reject(Error('Puppeteer has been stopped'))
                }

                if (running) {
                    return resolve()
                }

                var elapsedTime = Date.now() - startTime
                if (elapsedTime > self.startTimeout) {
                    return reject(Error(`Puppeteer did not start within ${self.startTimeout}ms`))
                }

                global.setTimeout(check, 100);
            })

            check()
        });
    }

    done() {
        cleanup()
        resolve()
    }
}