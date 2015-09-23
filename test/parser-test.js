'use strict';

var assert = require('assert');
var fixtures = require('./fixtures');

var wasmAST = require('../');

function test(source, expected) {
  source = fixtures.fn2str(source);

  var ast = wasmAST.parse(source);
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
          name: { type: 'Identifier', name: 'mul' },
          params: [ {
            type: 'Parameter',
            valueType: { type: 'Type', name: 'i32' },
            name: { type: 'Identifier', name: 'a' }
          }, {
            type: 'Parameter',
            valueType: { type: 'Type', name: 'i32' },
            name: { type: 'Identifier', name: 'b' }
          } ],
          result: { type: 'Type', name: 'i64' },
          body: [
            {
              type: 'ReturnStatement',
              argument: {
                type: 'TypeCall',
                result: { type: 'Type', name: 'i64' },
                method: 'mul',
                arguments: [ {
                  type: 'TypeCall',
                  result: { type: 'Type', name: 'i64' },
                  method: 'extend_u',
                  arguments: [ { type: 'Identifier', name: 'a' } ]
                }, {
                  type: 'TypeCall',
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
});
