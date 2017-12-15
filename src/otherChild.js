#! /usr/bin/env node

// const EventEmitter = require('events');
const ipc = require('node-ipc');

ipc.config.id = 'other';
ipc.config.maxConnections = 2;

console.log("start other child")

ipc.connectTo('timed', () => {
    ipc.of.timed.on('connect', () => {
        console.log('shook hands');
        ipc.of.timed.emit('begin');
    });
    ipc.of.timed.on('go', () => {
        console.log('given go');
        ipc.of.timed.emit('message', {
            text: "Hello, World!"
        });
    });
    ipc.of.timed.on('exit', () => {
        console.log('exiting');
        ipc.disconnect('timed');
        process.exit(0);
    })
});

setTimeout(() => {
    process.exit(1);
}, 10000);