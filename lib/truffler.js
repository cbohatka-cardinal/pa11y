'use strict';

var _ = require('underscore');
var async = require('async');
var jsdom = require('jsdom');
var pkg = require('../package.json');

exports.init = init;

// Create a tester function
function init (tests, opts) {
    tests = defaultTests(tests);
    opts = defaultOptions(opts);
    function domTester (context, done) {
        if (typeof context !== 'string') {
            throw new Error('context argument must be a string');
        }
        if (typeof done !== 'function') {
            throw new Error('done argument must be a function');
        }
        runTests(tests, opts, context, done);
    }
    return domTester;
}

// Default the tests
function defaultTests (tests) {
    if (Array.isArray(tests)) {
        return tests.slice();
    }
    return [];
}

// Default the tester options
function defaultOptions (opts) {
    return _.extend({}, {
        concurrency: 10,
        scripts: [],
        useragent: pkg.name + '/' + pkg.version
    }, opts);
}

// Run tests against a context
function runTests (tests, opts, context, done) {
    var config = buildJsdomConfig(opts, context);
    config.done = function (err, dom) {
        var results = [];
        tests = tests
            .filter(_.isFunction)
            .map(prepareTest.bind(null, dom, results.push.bind(results)));
        async.parallelLimit(tests, opts.concurrency, function (err) {
            done(err, results.filter(isDefined));
        });
    };
    jsdom.env(config);
}

// Build the JSDom config
function buildJsdomConfig (opts, context) {
    if (/^[a-z]+:\/\//i.test(context)) {
        return {
            url: context,
            headers: {
                'User-Agent': opts.useragent
            },
            scripts: opts.scripts
        };
    }
    return {
        html: context || '<!-- -->',
        scripts: opts.scripts
    };
}

// Prepare a test for async running
function prepareTest (dom, report, test) {
    return function (next) {
        try {
            test(dom, report, next);
        } catch (err) {
            next(err);
        }
    };
}

// Check whether a value is defined (not `undefined`)
function isDefined (val) {
    return (val !== undefined);
}