const { spawn } = require('child_process');
const ipc = require('node-ipc');

const pathA = __dirname + '/timedConnection.js';
const childA = spawn("node", [pathA], {
     //'pipe','inherit' or [ process.stdin, process.stdout, process.stderr ]
    // stdio: 'inherit',
    stdio: ['ignore', 'inherit', 'ignore'],
    // shell: true,
    // detached: true
});

const pathB =  __dirname + '/otherChild.js';
const childB = spawn("node", [pathB], {
    // stdio: 'inherit',
    stdio: ['ignore', 'inherit', 'ignore'],
    // shell: true,
    // detached: true
});
