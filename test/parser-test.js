'use strict';

var assert = require('assert');
var BN = require('bn.js');
var fixtures = require('./fixtures');

var wasmAST = require('../');

function test(source, expected, options) {
  source = fixtures.fn2str(source);

  var ast = wasmAST.parse(source, options);
  assert.deepEqual(ast, expected);
}

function testBody(source, expected, options) {
  source = fixtures.fn2str(source);

  var ast = wasmAST.parse(source, options);
  assert.deepEqual(ast.body[0].body, expected);
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
          name: { type: 'FunctionRef', name: 'second', index: 0 },
          params: [
            {
              type: 'ParamDeclaration',
              result: { type: 'Type', name: 'i32' },
              name: { type: 'Param', name: 'a', index: 0 }
            },
            {
              type: 'ParamDeclaration',
              result: { type: 'Type', name: 'i32' },
              name: { type: 'Param', name: 'b', index: 1 }
            },
            {
              type: 'ParamDeclaration',
              result: { type: 'Type', name: 'i32' },
              name: { type: 'Param', name: 'c', index: 2 }
            }
          ],
          result: { type: 'Type', name: 'i64' },
          body: [
            {
              type: 'ReturnStatement',
              argument: {
                type: 'Param', name: 'b', index: 1
              }
            }
          ]
        }
      ]
    }, {
      index: true
    });
  });

  it('should parse literal', function() {
    testBody(function() {/*
      i64 mul() {
        return i64.const(1);
      }
    */}, [
      {
        type: 'ReturnStatement',
        argument: {
          type: 'Builtin',
          result: { type: 'Type', name: 'i64' },
          method: 'const',
          arguments: [ {
            type: 'Literal',
            value: new BN(1)
          } ]
        }
      }
    ]);
  });

  it('should parse 64bit literal', function() {
    testBody(function() {/*
      i64 mul() {
        return i64.const(0xdeadbeefABBADEAD);
      }
    */}, [
      {
        type: 'ReturnStatement',
        argument: {
          type: 'Builtin',
          result: { type: 'Type', name: 'i64' },
          method: 'const',
          arguments: [ {
            type: 'Literal',
            value: new BN('deadbeefabbadead', 16)
          } ]
        }
      }
    ]);
  });

  it('should parse SequenceExpression', function() {
    testBody(function() {/*
      i64 mul() {
        return (i64.const(1), i64.const(2), i64.const(3));
      }
    */}, [
      {
        type: 'ReturnStatement',
        argument: {
          type: 'SequenceExpression',
          expressions: [
            {
              type: 'Builtin',
              result: { type: 'Type', name: 'i64' },
              method: 'const',
              arguments: [ {
                type: 'Literal',
                value: new BN(1)
              } ]
            },
            {
              type: 'Builtin',
              result: { type: 'Type', name: 'i64' },
              method: 'const',
              arguments: [ {
                type: 'Literal',
                value: new BN(2)
              } ]
            },
            {
              type: 'Builtin',
              result: { type: 'Type', name: 'i64' },
              method: 'const',
              arguments: [ {
                type: 'Literal',
                value: new BN(3)
              } ]
            }
          ]
        }
      }
    ]);
  });

  it('should parse VariableDeclaration', function() {
    testBody(function() {/*
      void mul() {
        i64 a = i64.const(1);
        i64 b;
      }
    */}, [
      {
        id: {
          name: 'a',
          type: 'Identifier'
        },
        result: {
          type: 'Type',
          name: 'i64'
        },
        init: {
          type: 'Builtin',
          result: { type: 'Type', name: 'i64' },
          method: 'const',
          arguments: [ {
            type: 'Literal',
            value: new BN(1)
          } ]
        },
        type: 'VariableDeclaration'
      },
      {
        id: {
          name: 'b',
          type: 'Identifier'
        },
        result: {
          type: 'Type',
          name: 'i64'
        },
        init: null,
        type: 'VariableDeclaration'
      }
    ]);
  });

  it('should parse AssignmentExpression', function() {
    testBody(function() {/*
      void mul() {
        a = b = c;
      }
    */}, [
      {
        type: 'ExpressionStatement',
        expression: {
          type: 'AssignmentExpression',
          operator: '=',
          left: { type: 'Identifier', name: 'a' },
          right: {
            type: 'AssignmentExpression',
            operator: '=',
            left: { type: 'Identifier', name: 'b' },
            right: { type: 'Identifier', name: 'c' }
          }
        }
      }
    ]);
  });

  it('should parse empty ReturnStatement', function() {
    testBody(function() {/*
      void mul() {
        return;
      }
    */}, [ {
      type: 'ReturnStatement',
      argument: null
    } ]);
  });

  it('should parse IfStatement', function() {
    testBody(function() {/*
      i64 mul(i64 a) {
        if (a) {
          return a;
        } else
          return i64.const(1);
      }
    */}, [ {
      type: 'IfStatement',
      test: { type: 'Identifier', name: 'a' },
      consequent: {
        type: 'BlockStatement',
        body: [ {
          type: 'ReturnStatement',
          argument: { type: 'Identifier', name: 'a' }
        } ]
      },
      alternate: {
        type: 'ReturnStatement',
        argument: {
          type: 'Builtin',
          result: { type: 'Type', name: 'i64' },
          method: 'const',
          arguments: [ {
            type: 'Literal',
            value: new BN(1)
          } ]
        }
      }
    } ]);
  });

  it('should parse blockless IfStatement', function() {
    testBody(function() {/*
      i64 mul(i64 a) {
        if (a)
          return a;
        else
          return i64.const(1);
      }
    */}, [ {
      type: 'IfStatement',
      test: { type: 'Identifier', name: 'a' },
      consequent: {
        type: 'ReturnStatement',
        argument: { type: 'Identifier', name: 'a' }
      },
      alternate: {
        type: 'ReturnStatement',
        argument: {
          type: 'Builtin',
          result: { type: 'Type', name: 'i64' },
          method: 'const',
          arguments: [ {
            type: 'Literal',
            value: new BN(1)
          } ]
        }
      }
    } ]);
  });

  it('should parse forever loop', function() {
    testBody(function() {/*
      i64 mul() {
        i64 t = i64.const(1);
        forever {
          t = i64.add(t, t);
        }

        // Not going to happen
        return t;
      }
    */}, [
      {
        type: 'VariableDeclaration',
        id: {
          name: 't',
          type: 'Identifier'
        },
        result: {
          type: 'Type',
          name: 'i64'
        },
        init: {
          type: 'Builtin',
          result: { type: 'Type', name: 'i64' },
          method: 'const',
          arguments: [ {
            type: 'Literal',
            value: new BN(1)
          } ]
        }
      },
      {
        type: 'ForeverStatement',
        body: {
          type: 'BlockStatement',
          body: [
            {
              type: 'ExpressionStatement',
              expression: {
                type: 'AssignmentExpression',
                operator: '=',
                left: { type: 'Identifier', name: 't' },
                right: {
                  type: 'Builtin',
                  result: { type: 'Type', name: 'i64' },
                  method: 'add',
                  arguments: [ {
                    type: 'Identifier', name: 't'
                  }, {
                    type: 'Identifier', name: 't'
                  } ]
                }
              }
            }
          ]
        }
      },
      {
        type: 'ReturnStatement',
        argument: { type: 'Identifier', name: 't' }
      }
    ]);
  });

  it('should parse forever loop with break/continue', function() {
    testBody(function() {/*
      void mul() {
        forever {
          continue;
          break;
        }
      }
    */}, [
      {
        type: 'ForeverStatement',
        body: {
          type: 'BlockStatement',
          body: [
            {
              type: 'ContinueStatement'
            },
            {
              type: 'BreakStatement'
            }
          ]
        }
      }
    ]);
  });

  it('should parse do_while loop', function() {
    testBody(function() {/*
      void mul(i64 a) {
        do {
        } while (a);
      }
    */}, [
      {
        type: 'DoWhileStatement',
        body: {
          type: 'BlockStatement',
          body: [ ]
        },
        test: { type: 'Identifier', name: 'a' }
      }
    ]);
  });

  it('should parser builtin statement', function() {
    testBody(function() {/*
      void mul(i64 a) {
        addr.page_size();
      }
    */}, [
      {
        type: 'ExpressionStatement',
        expression: {
          type: 'Builtin',
          result: { type: 'Type', name: 'addr' },
          method: 'page_size',
          arguments: []
        }
      }
    ]);
  });

  it('should parse call statement', function() {
    testBody(function() {/*
      void mul(i64 a) {
        test(a);
      }
      void test(i64 a) {
      }
    */}, [
      {
        type: 'ExpressionStatement',
        expression: {
          type: 'CallExpression',
          fn: { type: 'FunctionRef', name: 'test', index: 1 },
          arguments: [ { type: 'Param', name: 'a', index: 0 } ]
        }
      }
    ], {
      index: true
    });
  });
});
