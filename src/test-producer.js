//const crypto = require('crypto');
const ipc = require('node-ipc');
const puppeteer = require('puppeteer');
const launchOptions = {};

// ipc configuration
ipc.config.id = 'producer';
ipc.config.retry = 1500;
ipc.config.maxConnections = 1;

// start up of server
ipc.serve(() => {
    ipc.server.on('connect', (data, socket) => {});
    ipc.server.on('test', async(data, socket) => {
        const browser = puppeteer
        .launch(launchOptions)
        .then(async browser => {
            const page = await browser.newPage();

            console.log(data);

            page.goto("https://www.google.com", {});

            for (let i = 0; i < 10; i++) {
                const mockMsg = {
                    hello: "hello",
                    world: 'world',
                };
                ipc.server.emit(socket, 'result', mockMsg);
            }
            ipc.server.emit(socket, 'finish');

        })
        .catch((err) => {
            console.log("An error occurred: " + err);
            console.log("Trace Log: " + err.stack);
            process.exit(1);
        });


    });
    ipc.server.on('socket.disconnected', (data, socket) => {
        console.log("DISCONNECTED\n\n", arguments);
        ipc.server.stop();
        process.exit(0);
    });
})

ipc.server.start();
