'use strict';

var assert = require('assert');
var fixtures = require('./fixtures');

var wasmAST = require('../');

function test(source, expected) {
  var lexer = wasmAST.Lexer.create(fixtures.fn2str(source));

  var out = [];
  while (!lexer.end()) {
    out.push(lexer.next());
  }
  assert.deepEqual(out, expected);
}

describe('Lexer', function() {
  it('should handle empty function', function() {
    test(function() {/*
      void name() {
      }
    */}, [
      { type: 'Type', value: 'void' },
      { type: 'Identifier', value: 'name' },
      { type: 'Punctuation', value: '(' },
      { type: 'Punctuation', value: ')' },
      { type: 'Punctuation', value: '{' },
      { type: 'Punctuation', value: '}' }
    ]);
  });

  it('should handle function with parameters', function() {
    test(function() {/*
      i32 name(i32 a, i32 b) {
      }
    */}, [
      { type: 'Type', value: 'i32' },
      { type: 'Identifier', value: 'name' },
      { type: 'Punctuation', value: '(' },
      { type: 'Type', value: 'i32' },
      { type: 'Identifier', value: 'a' },
      { type: 'Punctuation', value: ',' },
      { type: 'Type', value: 'i32' },
      { type: 'Identifier', value: 'b' },
      { type: 'Punctuation', value: ')' },
      { type: 'Punctuation', value: '{' },
      { type: 'Punctuation', value: '}' }
    ]);
  });

  it('should handle function with single expression', function() {
    test(function() {/*
      i32 name(i32 a, i32 b) {
        return i32.mul(a, b);
      }
    */}, [
      { type: 'Type', value: 'i32' },
      { type: 'Identifier', value: 'name' },
      { type: 'Punctuation', value: '(' },
      { type: 'Type', value: 'i32' },
      { type: 'Identifier', value: 'a' },
      { type: 'Punctuation', value: ',' },
      { type: 'Type', value: 'i32' },
      { type: 'Identifier', value: 'b' },
      { type: 'Punctuation', value: ')' },
      { type: 'Punctuation', value: '{' },
      { type: 'Keyword', value: 'return' },
      { type: 'Type', value: 'i32' },
      { type: 'Punctuation', value: '.' },
      { type: 'Identifier', value: 'mul' },
      { type: 'Punctuation', value: '(' },
      { type: 'Identifier', value: 'a' },
      { type: 'Punctuation', value: ',' },
      { type: 'Identifier', value: 'b' },
      { type: 'Punctuation', value: ')' },
      { type: 'Punctuation', value: ';' },
      { type: 'Punctuation', value: '}' }
    ]);
  });

  it('should save/restore', function() {
    var source = 'a b c d';
    var lexer = wasmAST.Lexer.create(source);

    assert.equal(lexer.next().value, 'a');
    assert.equal(lexer.next().value, 'b');

    var save = lexer.save();

    assert.equal(lexer.next().value, 'c');
    assert.equal(lexer.next().value, 'd');

    assert(lexer.end());

    lexer.restore(save);
    assert(!lexer.end());

    assert.equal(lexer.next().value, 'c');
    assert.equal(lexer.next().value, 'd');

    assert(lexer.end());
  });

  describe('literals', function() {
    it('should handle int', function() {
      test('123', [ { type: 'Literal', value: '123' } ]);
    });

    it('should handle -int', function() {
      test('-123', [ { type: 'Literal', value: '-123' } ]);
    });

    it('should handle +int', function() {
      test('+123', [ { type: 'Literal', value: '+123' } ]);
    });

    it('should handle 1.', function() {
      test('1.', [ { type: 'Literal', value: '1.' } ]);
    });

    it('should handle 123.456', function() {
      test('123.456', [ { type: 'Literal', value: '123.456' } ]);
    });

    it('should handle 123.456e1', function() {
      test('123.456e1', [ { type: 'Literal', value: '123.456e1' } ]);
    });

    it('should handle 123.456e+1', function() {
      test('123.456e+1', [ { type: 'Literal', value: '123.456e+1' } ]);
    });

    it('should handle 123.456e-1', function() {
      test('123.456e-1', [ { type: 'Literal', value: '123.456e-1' } ]);
    });

    it('should handle 123)', function() {
      test('123)', [
        { type: 'Literal', value: '123' },
        { type: 'Punctuation', value: ')' }
      ]);
    });
  });
});
