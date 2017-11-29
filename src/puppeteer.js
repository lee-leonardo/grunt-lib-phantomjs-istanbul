'use strict';

exports.init = function (grunt) {
  // Nodejs libs.
  var path = require('path');
  var fs = require('fs');

  // External libs.
  var semver = require('semver');
  var Tempfile = require('temporary').File;
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
    var tempfile = new Tempfile();
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
      tempfile.unlink();
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

    // Internal methods.
    var privates = {
      // Abort if Puppeteer version isn't adequate.
      version: function (version) {
        var current = [version.major, version.minor, version.patch].join('.');
        var required = '>= 1.6.0';
        if (!semver.satisfies(current, required)) {
          exports.halt();
          grunt.log.writeln();
          grunt.log.errorlns(
            'In order for this task to work properly, Puppeteer version ' +
            required + ' must be installed, but version ' + current +
            ' was detected.'
          );
          grunt.warn('The correct version of Puppeteer needs to be installed.', 127);
        }
      }
    };

    (function pollingLoop() {
      // Disable logging temporarily.
      grunt.log.muted = true;
      // Read the file, splitting lines on \n, and removing a trailing line.
      var lines = grunt.file.read(tempfile.path).split('\n').slice(0, -1);
      // Re-enable logging.
      grunt.log.muted = false;
      // Iterate over all lines that haven't already been processed.
      var done = lines.slice(n).some(function (line) {
        // Get args and method.
        var args = JSON.parse(line);
        var eventName = args[0];
        // Debugging messages.
        grunt.log.debug(JSON.stringify(['puppeteer'].concat(args)).magenta);
        if (eventName === 'private') {
          // If a private (internal) message is passed, execute the
          // corresponding method.
          privates[args[1]].apply(null, args.slice(2));
        } else {
          // Otherwise, emit the event with its arguments.
          exports.emit.apply(exports, args);
        }
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
        id = setTimeout(loopy, 100);
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
      // The main Puppeteer script file.
      opts.puppeteerScript || asset('./main.js'),
      // The temporary file used for communications.
      tempfile.path,
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
    }, function (err, result, code) {
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