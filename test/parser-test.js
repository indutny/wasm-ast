'use strict';

var assert = require('assert');
var fixtures = require('./fixtures');

var wasmAST = require('../');

function test(source, expected, options) {
  source = fixtures.fn2str(source);

  var ast = wasmAST.parse(source, options);
  assert.deepEqual(ast, expected);
}

describe('Parser', function() {
  it('should parse basic function', function() {
    test(function() {/*
      i64 mul(i32 a, i32 b) {
        return i64.mul(i64.extend_u(a), i64.extend_u(b));
      }
    */}, {
      type: 'Program',
      body: [
        {
          type: 'Function',
          localCount: 0,
          name: { type: 'Identifier', name: 'mul' },
          params: [ {
            type: 'ParamDeclaration',
            result: { type: 'Type', name: 'i32' },
            name: { type: 'Identifier', name: 'a' }
          }, {
            type: 'ParamDeclaration',
            result: { type: 'Type', name: 'i32' },
            name: { type: 'Identifier', name: 'b' }
          } ],
          result: { type: 'Type', name: 'i64' },
          body: [
            {
              type: 'ReturnStatement',
              argument: {
                type: 'Builtin',
                result: { type: 'Type', name: 'i64' },
                method: 'mul',
                arguments: [ {
                  type: 'Builtin',
                  result: { type: 'Type', name: 'i64' },
                  method: 'extend_u',
                  arguments: [ { type: 'Identifier', name: 'a' } ]
                }, {
                  type: 'Builtin',
                  result: { type: 'Type', name: 'i64' },
                  method: 'extend_u',
                  arguments: [ { type: 'Identifier', name: 'b' } ]
                } ]
              }
            }
          ]
        }
      ]
    });
  });

  it('should index params', function() {
    test(function() {/*
      i64 second(i32 a, i32 b, i32 c) {
        return b;
      }
    */}, {
      type: 'Program',
      body: [
        {
          type: 'Function',
          localCount: 0,
          name: { type: 'FunctionRef', index: 0 },
          params: [
            {
              type: 'ParamDeclaration',
              result: { type: 'Type', name: 'i32' },
              name: { type: 'Param', index: 0 }
            },
            {
              type: 'ParamDeclaration',
              result: { type: 'Type', name: 'i32' },
              name: { type: 'Param', index: 1 }
            },
            {
              type: 'ParamDeclaration',
              result: { type: 'Type', name: 'i32' },
              name: { type: 'Param', index: 2 }
            }
          ],
          result: { type: 'Type', name: 'i64' },
          body: [
            {
              type: 'ReturnStatement',
              argument: {
                type: 'Param', index: 1
              }
            }
          ]
        }
      ]
    }, {
      index: true
    });
  });
});
