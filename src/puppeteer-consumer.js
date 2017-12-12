var ipc = require('node-ipc');
ipc.config.id = 'consumer';
ipc.config.retry = 1500;
ipc.config.maxConnections = 1;

var json = {
  url: "/Users/leolee/EWEGithub/epc-roomsandrates-web/src/static-content-test/scripts/ratesAndAvail/inventoryItemView_qunit.html"
}

ipc.connectTo('producer', () => {
  ipc.of.producer.on('connect', () => {
      console.log('established connection with puppeteer-sock'.rainbow);
      ipc.of.producer.emit('test.page', json);
    }
  );
  ipc.of.producer.on('results', (results) => {
      ipc.log('results : '.debug, results);
    }
  );
  ipc.of.producer.on('error', (error) => {
    ipc.log('error: ', error);
    ipc.log('stack: ', error.stack);
  });
  ipc.of.producer.on('finish', () => {
      console.log("finised operation");
      ipc.disconnect('producer');
    }
  )
  ipc.of.producer.on('disconnect', () => {
      ipc.log("disconnected from connection with puppeteer-sock".notice);
    }
  );
});