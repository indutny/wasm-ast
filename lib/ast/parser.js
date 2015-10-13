'use strict';

var assert = require('assert');
var BN = require('bn.js');

var ast = require('../ast');
var Scope = ast.Scope;

function Parser(source, options) {
  this.lexer = ast.Lexer.create(source);
  this.options = options || {};
  this.imported = {};
  this.scope = new Scope(null);
  this.localScope = this.scope;
  this.loopDepth = 0;
}
module.exports = Parser;

Parser.create = function create(source, options) {
  return new Parser(source, options);
};

Parser.prototype.parse = function parse() {
  var body = [];
  while (!this.lexer.end()) {
    body.push(this.parseTopLevel());
  }
  this.localScope.check();

  return {
    type: 'Program',
    body: body
  };
};

Parser.prototype.end = function end() {
  return this.lexer.end();
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

Parser.prototype.peek = function peek(type, value) {
  var save = this.lexer.save();
  var lexem = this.lexer.next();
  this.lexer.restore(save);
  if (lexem.type === type && (value === undefined || lexem.value === value))
    return lexem.value;

  return false;
};

Parser.prototype.parseTopLevel = function parseTopLevel() {
  var type = this.maybe('Type');
  if (type !== false)
    return this.parseTopLevelFn(type);

  var keyword = this.maybe('Keyword');
  if (keyword === 'import')
    return this.parseImport();

  if (keyword === 'export')
    return this.parseExport();

  if (keyword === false)
    assert(false, 'Expected either type or keyword');
  else
    assert(false, 'Unexpected keyword: ' + keyword);
};

Parser.prototype.type = function type(name) {
  return { type: 'Type', name: name };
};

Parser.prototype.lookup = function lookup(name, type) {
  if (this.options.index !== true)
    return { type: 'Identifier', name: name };

  return this.scope.lookup(name, type);
};

Parser.prototype.assign = function assign(name, kind) {
  if (this.options.index !== true)
    return { type: 'Identifier', name: name };

  return this.scope.assign(name, kind);
};

Parser.prototype.reserveLocal = function reserveLocal(name, type) {
  if (this.imported.hasOwnProperty(name))
    return this.externalFn(this.imported[name], name);

  if (this.options.index !== true)
    return { type: 'Identifier', name: name };

  return this.localScope.reserve(name, type);
};

Parser.prototype.externalFn = function externalFn(module, name) {
  return { type: 'External', module: module, name: name };
};

Parser.prototype.fulfillLocal = function fulfillLocal(name, type) {
  if (this.options.index !== true)
    return { type: 'Identifier', name: name };

  return this.localScope.fulfill(name, type);
};

Parser.prototype.parseTopLevelFn = function parseTopLevelFn(result) {
  assert.notEqual(result, 'addr', 'addr type can\'t be returned');

  var type = this.type(result);
  var name = this.fulfillLocal(this.expect('Identifier'), 'FunctionRef');

  this.scope = new Scope(this.scope);
  var out = {
    type: 'Function',
    result: type,
    name: name,
    params: this.parseFnParams(),
    body: null,
    localCount: 0
  };
  var block = this.parseBlock();
  out.body = block.body;
  out.localCount = this.scope.localCount();
  this.scope.check();
  this.scope = this.scope.parent;
  return out;
};

Parser.prototype.parseFnParams = function parseFnParams() {
  this.expect('Punctuation', '(');

  if (this.maybe('Punctuation', ')') !== false)
    return [];

  var out = [];
  while (true) {
    var type = this.expect('Type');
    assert.notEqual(type, 'addr', 'addr type can\'t be a parameter');
    out.push({
      type: 'ParamDeclaration',
      result: this.type(type),
      name: this.assign(this.expect('Identifier'), 'Param')
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

    var stmt = this.parseStatement();
    out.push(stmt);
    if (stmt.type !== 'IfStatement' && stmt.type !== 'ForeverStatement')
      this.expect('Punctuation', ';');
    while (this.maybe('Punctuation', ';') !== false) {}
  }

  return { type: 'BlockStatement', body: out };
};

Parser.prototype.parseStatement = function parseStatement() {
  var keyword = this.maybe('Keyword');

  if (keyword === 'return')
    return this.parseReturn();

  if (keyword === 'if')
    return this.parseIf();

  if (keyword === 'forever')
    return this.parseForever();

  if (keyword === 'do')
    return this.parseDoWhile();

  if (keyword === 'break')
    return this.parseBreak();

  if (keyword === 'continue')
    return this.parseContinue();

  if (keyword !== false) {
    assert.equal(keyword, false, 'Unexpected keyword: ' + keyword);
    return;
  }

  // `i32 a` or `i32 a = ...`
  var save = this.lexer.save();
  var type = this.maybe('Type');
  if (type !== false && this.peek('Identifier'))
    return this.parseVarDecl(type);

  this.lexer.restore(save);
  return {
    type: 'ExpressionStatement',
    expression: this.parseExpression()
  };
};

Parser.prototype.parseReturn = function parseReturn() {
  return {
    type: 'ReturnStatement',
    argument: this.peek('Punctuation', ';') !== false ?
        null : this.parseExpression()
  };
};

Parser.prototype.parseIf = function parseIf() {
  this.expect('Punctuation', '(');
  var test = this.parseExpression();
  this.expect('Punctuation', ')');

  return {
    type: 'IfStatement',
    test: test,
    consequent: this.parseBlockOrStmt(),
    alternate: this.maybe('Keyword', 'else') ? this.parseBlockOrStmt() : null
  };
};

Parser.prototype.parseBlockOrStmt = function parseBlockOrStmt() {
  if (this.maybe('Punctuation', '{') === false) {
    var res = this.parseStatement();
    this.expect('Punctuation', ';');
    return res;
  }

  var out = [];
  while (true) {
    if (this.maybe('Punctuation', '}') !== false)
      break;

    var stmt = this.parseStatement();
    out.push(stmt);
    if (stmt.type !== 'IfStatement')
      this.expect('Punctuation', ';');
    while (this.maybe('Punctuation', ';') !== false) {}
  }

  return { type: 'BlockStatement', body: out };
};

Parser.prototype.parseExpression = function parseExpression() {
  var paren = this.maybe('Punctuation', '(');

  // (a, b, c)
  if (paren !== false)
    return this.parseSeqExpression();

  var name = this.maybe('Identifier');
  if (name !== false) {
    if (this.maybe('Punctuation', '=') !== false)
      return this.parseAssignment(name);
    if (this.peek('Punctuation', '(') !== false ||
        this.peek('Punctuation', '::') !== false) {
      return this.parseCall(name);
    }
    return this.lookup(name);
  }

  // type.routine
  var type = this.maybe('Type');
  if (type !== false)
    return this.parseBuiltin(type);

  var literal = this.maybe('Literal');
  if (literal !== false)
    return this.parseLiteral(literal);

  throw new Error('Not implemented: ' + this.lexer.next().type);
};

Parser.prototype.parseSeqExpression = function parseSeqExpression() {
  var out = [];

  while (true) {
    out.push(this.parseExpression());
    var punc = this.expect('Punctuation');
    if (punc === ',')
      continue;

    assert.equal(punc, ')', 'Matching closing paren not found');
    break;
  }

  return {
    type: 'SequenceExpression',
    expressions: out
  };
};

Parser.prototype.parseBuiltin = function parseBuiltin(type) {
  this.expect('Punctuation', '.');
  var method = this.expect('Identifier');

  return {
    type: 'Builtin',
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

Parser.prototype.parseLiteral = function parseLiteral(value) {
  var num;
  if (/^0x/.test(value))
    num = new BN(value.slice(2), 16);
  else if (/[e\.]/.test(value))
    num = parseFloat(value);
  else
    num = new BN(value, 10);

  return { type: 'Literal', value: num };
};

Parser.prototype.parseVarDecl = function parseVarDecl(type) {
  assert(type !== 'void', 'Can\'t declare void variable');
  var name = this.expect('Identifier');

  var init = null;
  var assign = this.maybe('Punctuation', '=');
  if (assign !== false)
    init = this.parseExpression();

  return {
    type: 'VariableDeclaration',
    result: this.type(type),
    id: this.assign(name, 'Local'),
    init: init
  };
};

Parser.prototype.parseAssignment = function parseAssignment(name) {
  return {
    type: 'AssignmentExpression',
    operator: '=',
    left: this.lookup(name, 'Local'),
    right: this.parseExpression()
  };
};

Parser.prototype.parseForever = function parseForever() {
  this.loopDepth++;
  var res = {
    type: 'ForeverStatement',
    body: this.parseBlockOrStmt()
  };
  this.loopDepth--;
  return res;
};

Parser.prototype.parseDoWhile = function parseDoWhile() {
  this.loopDepth++;
  var body = this.parseBlockOrStmt();
  this.expect('Keyword', 'while');
  this.expect('Punctuation', '(');
  var test = this.parseExpression();
  this.expect('Punctuation', ')');
  var res = {
    type: 'DoWhileStatement',
    body: body,
    test: test
  };
  this.loopDepth--;
  return res;
};

Parser.prototype.parseBreak = function parseBreak() {
  assert(this.loopDepth > 0, '`break` outside of the loop');
  return {
    type: 'BreakStatement'
  };
};

Parser.prototype.parseContinue = function parseContinue() {
  assert(this.loopDepth > 0, '`continue` outside of the loop');
  return {
    type: 'ContinueStatement'
  };
};

Parser.prototype.parseCall = function parseCall(name) {
  var fn;
  if (this.maybe('Punctuation', '::')) {
    var module = name;
    name = this.expect('Identifier');
    fn = this.externalFn(module, name);
  } else {
    fn = this.reserveLocal(name, 'FunctionRef');
  }

  return {
    type: 'CallExpression',
    fn: fn,
    arguments: this.parseCallParams()
  };
};

Parser.prototype.parseImport = function parseImport() {
  var names = [];
  do
    names.push(this.expect('Identifier'));
  while (this.maybe('Punctuation', ','));

  // TODO(indutny): should it be a keyword?
  this.expect('Identifier', 'from');

  var module = this.expect('Identifier');

  for (var i = 0; i < names.length; i++) {
    assert(!this.imported.hasOwnProperty(names[i]),
           'Duplicate imported fn: ' + names[i]);
    this.imported[names[i]] = module;
    names[i] = this.externalFn(module, names[i]);
  }

  return {
    type: 'ImportStatement',
    names: names,
    module: { type: 'Identifier', name: module }
  };
};

Parser.prototype.parseExport = function parseExport() {
  var names = [];
  do
    names.push(this.reserveLocal(this.expect('Identifier')));
  while (!this.end() && this.maybe('Punctuation', ','));

  return {
    type: 'ExportStatement',
    names: names
  };
};
