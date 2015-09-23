'use strict';

var ast = require('../ast');

exports.parse = function parse(source, options) {
  return ast.Parser.create(source, options).parse();
};
