#! /usr/bin/env node

const ipc = require('node-ipc');

ipc.config.id = 'timed';
ipc.config.maxConnections = 2;

console.log("start timed connection");

ipc.serve(() => {
    ipc.server.on('begin', (data, socket) => {
        console.log('begin');
        ipc.server.emit(socket, 'go');
    });
    ipc.server.on('message', (data, socket) => {
        console.log(data.text);
        ipc.server.emit(socket, 'exit');
    })
    ipc.server.on('socket.disconnected', (data, socket) => {
        console.log('disconnected');
        // ipc.server.stop();
        process.exit(0);
    });
})

ipc.server.start();

setTimeout(() => {
    ipc.server.stop();
    process.exit(1);
}, 10000);