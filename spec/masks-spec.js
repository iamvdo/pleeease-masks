// Jasmine unit tests
// To run tests, run these commands from the project root:
// 1. `npm test`

'use strict';
var fs     = require('fs');
var mask   = require('../index');

var __dirname = 'spec/cases/';

var test = function (name, options) {
  // css
  var css = fs.readFileSync(__dirname + name + '.css', 'utf-8');
  var expected;

  if (typeof options !== 'undefined' && options.same) {
    expected = css;
  } else {
    expected = fs.readFileSync(__dirname + name + '.out.css', 'utf-8');
  }

  // process
  var processed = mask.process(css, options);

  expect(processed).toBe(expected);
};

describe('pleeease-masks', function () {

  it('should convert polygon() with px', function() {

    test('clipPath/polygon-px');

  });

  it('should convert polygon() with %', function() {

    test('clipPath/polygon-percents');

  });

  it('should not convert polygon() with multiple units', function() {

    test('clipPath/polygon-invalid');

  });

});