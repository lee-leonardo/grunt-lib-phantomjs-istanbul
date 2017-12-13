'use strict';

/*
  Steps:
  1. setup the event emitter syntax and harmonize it with puppeteer consumer
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

exports.init = function (grunt) {
  // Nodejs libs.
  var path = require('path');
  var fs = require('fs');

  //TODO spawn producer process with the requisite information.
  //TODO setup the consumer and listen on event

  // External libs.
  var EventEmitter2 = require('eventemitter2').EventEmitter2;

  // Get path to Puppeteer binary
  var binPath = "./bin/grunt-puppeteer.js";

  // The module to be exported is an event emitter.
  var exports = new EventEmitter2({
    wildcard: true,
    maxListeners: 0
  });

  // Get an asset file, local to the root of the project.
  var asset = path.join.bind(null, __dirname, '..');

  // Call this when everything has finished successfully... or when something
  // horrible happens, and you need to clean up and abort.
  var halted;
  exports.halt = function () {
    halted = true;
  };

  exports.spawn = function (pageUrl, options) {
    // Create temporary file to be used for grunt-puppeteer communication.
    console.log(pageUrl);

    //TODO

    // var a = fs.readSync(tempfile.fd, "utf8");
    // console.log(a);

    // var b = fs.readSync(tempfile.fd, { encoding: "buffer" });
    // console.log(b);


    //TODO figure out a way to create a readable stream! Something that listens to evnts and etc.





    // await tmp.file((err, path, fs, cleanCb) => {
    //   console.log(err);
    //   console.log(path);
    //   console.log(fs);
    // });


    // Timeout ID.
    var id;
    // The number of tempfile lines already read.
    var n = 0;
    // Reset halted flag.
    halted = null;
    // Handle for spawned process.
    var puppeteerHandle;
    // Default options.
    if (typeof options.killTimeout !== 'number') {
      options.timeout = 5000;
    }
    options.options = options.options || {};

    // All done? Clean up!
    var cleanup = function (done, immediate) {
      clearTimeout(id);







      // TODO clean up, by killing ish.





      var kill = function () {
        // Only kill process if it has a pid, otherwise an error would be thrown.
        if (puppeteerHandle.pid) {
          puppeteerHandle.kill();
        }
        if (typeof done === 'function') {
          done(null);
        }
      };
      // Allow immediate killing in an error condition.
      if (immediate) {
        return kill();
      }
      // Wait until the timeout expires to kill the process, so it can clean up.
      setTimeout(kill, options.killTimeout);
    };

    (function pollingLoop() {
      // Disable logging temporarily.
      grunt.log.muted = true;
      // Read the file, splitting lines on \n, and removing a trailing line.






      //TODO instead of reading a file, capture the output from puppeteer
      // var lines = grunt.file.read(tempfile.path).split('\n').slice(0, -1);






      // Re-enable logging.
      grunt.log.muted = false;
      // Iterate over all lines that haven't already been processed.
      var done = lines.slice(n).some(function (line) {
        // Get args and method.
        var args = JSON.parse(line);
        var eventName = args[0];
        // Debugging messages.
        grunt.log.debug(JSON.stringify(['puppeteer'].concat(args)).magenta);
        // Otherwise, emit the event with its arguments.
        exports.emit.apply(exports, args);

        // If halted, return true. Because the Array#some method was used,
        // this not only sets "done" to true, but stops further iteration
        // from occurring.
        return halted;
      });

      if (done) {
        // All done.
        cleanup(options.done);
      } else {
        // Update n so previously processed lines are ignored.
        n = lines.length;
        // Check back in a little bit.
        id = setTimeout(pollingLoop, 100);
      }
    }());

    // Process options.
    var failCode = options.failCode || 0;
    // An array of optional Puppeteer --args.
    var args = [];
    // Additional options for the Puppeteer main.js script.
    var opts = {};

    // Build args array / opts object.
    Object.keys(options.options).forEach(function (key) {
      if (/^\-\-/.test(key)) {
        args.push(key + '=' + options.options[key]);
      } else {
        opts[key] = options.options[key];
      }
    });

    // Keep -- Puppeteer args first, followed by grunt-specific args.
    args.push(
      // The temporary file used for communications. fs.write requires the file descriptor rather than the file path
      // URL or path to the page .html test file to run.
      pageUrl,
      // Additional Puppeteer options.
      JSON.stringify(opts)
    );

    grunt.log.debug(JSON.stringify(args));

    // Actually spawn Puppeteer.
    return puppeteerHandle = grunt.util.spawn({
      cmd: binPath,
      args: args
    }, function doneFunction(err, result, code) {
      if (!err) {
        return;
      }

      // Ignore intentional cleanup.
      if (code === 15 || code === null /* SIGTERM */ ) {
        return;
      }

      // If we're here, something went horribly wrong.
      cleanup(null, true /* immediate */ );
      grunt.verbose.or.writeln();
      grunt.log.write('Puppeteer threw an error:').error();
      // Print result to stderr because sometimes the 127 code means that a shared library is missing
      String(result).split('\n').forEach(grunt.log.error, grunt.log);
      if (code === 127) {
        grunt.log.errorlns(
          'In order for this task to work properly, Puppeteer must be installed locally via NPM. ' +
          'If you\'re seeing this message, generally that means the NPM install has failed. ' +
          'Please submit an issue providing as much detail as possible at: ' +
          'https://github.com/gruntjs/grunt-lib-puppeteer-istanbul/issues'
        );
        grunt.warn('Puppeteer not found.', failCode);
      } else {
        grunt.warn('Puppeteer exited unexpectedly with exit code ' + code + '.', failCode);
      }
      options.done(code);
    });
  };

  return exports;
};
