'use strict';

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
    var options = this.options();
    var url = require('fs').realpathSync(options.url);
    var puppeteer = require('./src/puppeteer').init(grunt);

    // Load up and Instantiate the test server
    if (options.server) { require(options.server); }

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

    // This task is async.
    var done = this.async();

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
