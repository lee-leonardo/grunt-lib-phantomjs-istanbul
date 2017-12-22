const puppeteer = require('puppeteer');

puppeteer
  .launch({})
  .then(async browser => {
    const page = await browser.newPage();

    await page.on('console', (msg) => {
      new Promise((resolve, reject) => {
          if (msg.text.includes("JSHandle")) {
            Promise.all(msg.args.map(promise => promise.jsonValue()))
              .then(args => {
                console.log(args);
                resolve(args)
              })
              .catch(err => {
                reject(Error("unable to resolve: " + msg))
              })
          } else {
            resolve(msg.text)
          }
        })
        .then(json => {
          console.log({
            type: msg.type,
            json: json
          })
          // ipc.server.emit(socket, `console.${msg.type}`, {
          //   type: msg.type,
          //   json: json
          // })
        })
    })

    // page.on('console', msg => {
    //   console.log(msg);

    //   for (let i = 0; i < msg.args.length; ++i) {
    //     console.log(`${i}: ${msg.args[i]}`);

    //     msg.args[i].jsonValue().then(json => {
    //       console.log(json);
    //     })
    //   }

    // });

    page.evaluate(() => {
      console.log("hello");
      console.log(1);
      console.log([1,2]);
      console.log(true);
      console.log({ a: 1, b: false });
      console.log('hello', 5, { foo: 'bar' });
    })
      .then(() => {
        browser.close();
      })
  })