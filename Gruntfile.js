'use strict';

global.__basedir = __dirname;

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'src/*.js',
        'test/*.js'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },
    test: {
      basic: {
        options: {
          url: 'test/fixtures/basic.html',
          expected: [1, 2, 3, 4, 5, 6],
          test: function test(a, b, c) {
            if (!test.actual) { test.actual = []; }
            test.actual.push(a, b, c);
          }
        }
      },
      inject: {
        options: {
          url: 'test/fixtures/inject.html',
          expected: 'injected',
          test: function test(msg) {
            test.actual = msg;
          },
          puppeteer: {
            inject: require('path').resolve('test/fixtures/inject.js')
          }
        }
      },
      headers: {
        options: {
          url: 'http://localhost:8075',
          server: './test/fixtures/headers_server.js',
          expected: 'custom_header_567',
          test: function test(msg) {
            test.actual = msg;
          },
          puppeteer: {
            page: {
              customHeaders: {
                'X-CUSTOM': 'custom_header_567'
              }
            }
          }
        }
      },
      viewportSize: {
        options: {
          url: 'test/fixtures/viewportSize.html',
          expected: [1366, 800],
          test: function test(a, b) {
            if (!test.actual) { test.actual = []; }
            test.actual.push(a, b);
          },
          puppeteer: {
            page: {
              viewportSize: {
                width: 1366,
                height: 800
              }
            }
          }
        }
      }
    }
  });

  // The most basic of tests. Not even remotely comprehensive.
  grunt.registerMultiTask('test', 'A test, of sorts.', function() {
    /*
      Sequence of Events:
      1. spawn thread of producer
      2. spawn thread of consumer, this handles the async call.
      3. consumer connects to producer
      4. consumer sends path to qunit html file to producer
      5. producer navigates to the page and evaluates it, sending log and utlimately the successs status
      6. producer notifies the consumer when it is finished, consumer disconnects.
      7. consumer kills itself resolving it's async call
      8. producer kills itself when there are no consumers left
      9. resolve grunt job with the success status determining success of failure.
    */
    /*
      grunt
        task
          producer (or producer monitor with internal queue with hashes for each consumer thread)
          consumer threads (if using monitor, there are many consumer threads)
    */
    var options = this.options();
    var url = require('fs').realpathSync(options.url);
    var done = this.async();

    //TODO is this the syntax we desire? Fluent as it maybe, it seems like it could improve.
    var job = require('./src/puppeteer-eventEmitter');
    var puppeteer = new job.init(grunt, options, function (isSuccessful) {
      console.log(`resolve fired with value: ${isSuccessful}`);
      done(isSuccessful);
    });

    // Load up and Instantiate the test server
    if (options.server) { require(options.server); }

    //TODO this needs to be updated
    // Do something.
    puppeteer.on('test', options.test);

    puppeteer.on('done', puppeteer.halt);

    puppeteer.on('debug', function(msg) {
        grunt.log.writeln('debug:' + msg);
    });

    // // Built-in error handlers.
    puppeteer.on('fail.load', function(url) {
      puppeteer.halt();
      grunt.verbose.write('Running Puppeteer...').or.write('...');
      grunt.log.error();
      grunt.warn('Puppeteer unable to load "' + url + '" URI.');
    });

    puppeteer.on('fail.timeout', function() {
      puppeteer.halt();
      grunt.log.writeln();
      grunt.warn('Puppeteer timed out.');
    });
    //TODO

    //TODO update this spawn method to work with the newer api.
    // Spawn puppeteer
    puppeteer.spawn(url, {
      // Additional Puppeteer options.
      options: options.puppeteer,
      // Complete the task when done.
      done: function(err) {
        if (err) { done(err); return; }
        var assert = require('assert');
        var difflet = require('difflet')({indent: 2, comment: true});
        try {
          assert.deepEqual(options.test.actual, options.expected, 'Actual should match expected.');
          grunt.log.writeln('Test passed.');
          done();
        } catch (err) {
          grunt.log.subhead('Assertion Failure');
          console.log(difflet.compare(err.expected, err.actual));
          done(err);
        }
      }
    });
  });

  // The jshint plugin is used for linting.
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // By default, lint library.
  grunt.registerTask('default', ['jshint', 'test']);

};
