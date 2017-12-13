var EventEmitter = require('events');

class Type extends EventEmitter {
  constructor(chainFn, parent) {
    super();
    this.resolve = chainFn;
    this.parent = parent;

    if (this.parent) {
      this.parent.on('resolve', num => {
        this.resolve(num);
        this.emit('resolve', num + 1);
      });
    }
  }
}

function log(num) {
  console.log(num);
}

var chainOne = new Type((num) => {
  console.log(num);
  chainOne.emit('resolve', num + 1);
});
var chainTwo = new Type(log, chainOne);
var chainThree = new Type(log, chainTwo);

chainOne.resolve(1); // Logs 1/n2/n3