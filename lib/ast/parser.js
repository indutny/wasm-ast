'use strict';

var assert = require('assert');

var ast = require('../ast');

function Parser(source) {
  this.lexer = ast.Lexer.create(source);
}
module.exports = Parser;

Parser.create = function create(source) {
  return new Parser(source);
};

Parser.prototype.parse = function parse() {
  var body = [];
  while (!this.lexer.end()) {
    body.push(this.parseTopLevel());
  }

  return {
    type: 'Program',
    body: body
  };
};

Parser.prototype.maybe = function maybe(type, value) {
  var save = this.lexer.save();
  var lexem = this.lexer.next();
  if (lexem.type === type && (value === undefined || lexem.value === value))
    return lexem.value;

  this.lexer.restore(save);
  return false;
};

Parser.prototype.expect = function expect(type, value) {
  var lexem = this.lexer.next();
  if (lexem.type === type && (value === undefined || lexem.value === value))
    return lexem.value;

  throw new Error('Unexpected lexem: ' + JSON.stringify(lexem));
};

Parser.prototype.parseTopLevel = function parseTopLevel() {
  var type = this.maybe('Type');
  if (type !== false)
    return this.parseTopLevelFn(type);

  return this.parseTopLevelExport();
};

Parser.prototype.type = function type(name) {
  return { type: 'Type', name: name };
};

Parser.prototype.id = function id(name) {
  return { type: 'Identifier', name: name };
};

Parser.prototype.parseTopLevelFn = function parseTopLevelFn(result) {
  return {
    type: 'Function',
    result: this.type(result),
    name: this.id(this.expect('Identifier')),
    params: this.parseFnParams(),
    body: this.parseBlock()
  };
};

Parser.prototype.parseFnParams = function parseFnParams() {
  this.expect('Punctuation', '(');

  if (this.maybe('Punctuation', ')') !== false)
    return [];

  var out = [];
  while (true) {
    out.push({
      type: 'Parameter',
      valueType: this.type(this.expect('Type')),
      name: this.id(this.expect('Identifier'))
    });

    if (this.maybe('Punctuation', ',') !== false)
      continue;

    break;
  }

  this.expect('Punctuation', ')');

  return out;
};

Parser.prototype.parseBlock = function parseBlock() {
  this.expect('Punctuation', '{');

  var out = [];
  while (true) {
    if (this.maybe('Punctuation', '}') !== false)
      break;

    out.push(this.parseStatement());
    this.expect('Punctuation', ';');
  }

  return out;
};

Parser.prototype.parseStatement = function parseStatement() {
  var keyword = this.expect('Keyword');

  if (keyword === 'return') {
    return {
      type: 'ReturnStatement',
      argument: this.parseExpression()
    };
  }

  assert.equal(keyword, undefined, 'Unexpected keyword');
};

Parser.prototype.parseExpression = function parseExpression() {
  var name = this.maybe('Identifier');
  if (name !== false)
    return this.id(name);

  // type.routine
  var type = this.maybe('Type');
  if (type !== false)
    return this.parseTypeCall(type);
};

Parser.prototype.parseTypeCall = function parseTypeCall(type) {
  this.expect('Punctuation', '.');
  var method = this.expect('Identifier');

  return {
    type: 'TypeCall',
    result: this.type(type),
    method: method,
    arguments: this.parseCallParams()
  };
};

Parser.prototype.parseCallParams = function parseCallParams() {
  this.expect('Punctuation', '(');

  if (this.maybe('Punctuation', ')') !== false)
    return [];

  var out = [];
  while (true) {
    out.push(this.parseExpression());
    if (this.maybe('Punctuation', ',') !== false)
      continue;

    break;
  }

  this.expect('Punctuation', ')');

  return out;
};
