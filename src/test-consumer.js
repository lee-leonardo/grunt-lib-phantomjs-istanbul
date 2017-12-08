//const crypto = require('crypto');
const ipc = require('node-ipc');

// const producer = require('./test-producer');
// const spawn = require('child_process').spawn;

ipc.config.id = 'consumer';
ipc.config.retry = 1500;
ipc.config.maxConnections = 1;

//TODO get the testsObject from grunty-poo
const testsObject = {
    a: []
}

ipc.connectTo('producer', () => {
    ipc.of.producer.on('connect', () => {
        console.log('established connection with puppeteer-socket'.rainbow);
        ipc.of.producer.emit('test', testsObject);
    });
    ipc.of.producer.on('results', (results) => {
        //Handle
        console.log(results);
    });
    ipc.of.producer.on('finish', () => {
        ipc.disconnect('producer');
    });
    ipc.of.producer.on('disconnect', () => {
        ipc.log("disconnected from connection with puppeteer-socket".notice);
    });
});