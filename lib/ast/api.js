'use strict';

var ast = require('../ast');

exports.parse = function parse(source) {
  return ast.Parser.create(source).parse();
};
