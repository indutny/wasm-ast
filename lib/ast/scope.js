'use strict';

var assert = require('assert');

function Scope(parent) {
  this.parent = parent;

  this.map = {};
  this.indexes = {
    FunctionRef: 0,
    Local: 0,
    Param: 0
  };
  this.unresolved = {};
}
module.exports = Scope;

Scope.prototype.assign = function assign(name, type) {
  assert(!this.map.hasOwnProperty(name), 'Failed to redeclare: ' + name);
  var res = {
    type: type,
    name: name,
    index: this.indexes[type]++
  };
  this.map[name] = res;
  return res;
};

Scope.prototype.fulfill = function fulfill(name, type) {
  var isPending = this.unresolved.hasOwnProperty(name);
  if (!isPending)
    return this.assign(name, type);

  var res = this.lookup(name, type);
  delete this.unresolved[name];
  return res;
};

Scope.prototype.lookup = function lookup(name, type) {
  var current = this;
  while (current !== null && !current.map.hasOwnProperty(name))
    current = current.parent;

  assert(current !== null, 'Failed to lookup: ' + name);
  var res = current.map[name];
  if (type !== undefined)
    assert.equal(res.type, type, 'Invalid variable type');

  return res;
};

Scope.prototype.reserve = function reserve(name, type) {
  var current = this;
  while (current !== null && !current.map.hasOwnProperty(name))
    current = current.parent;

  if (current !== null) {
    var res = current.map[name];
    if (type !== undefined)
      assert.equal(res.type, type, 'Invalid variable type');
    return res;
  }

  var res = this.assign(name, type);
  this.unresolved[name] = true;
  return res;
};

Scope.prototype.localCount = function localCount() {
  return this.indexes.Local;
};

Scope.prototype.check = function check() {
  var keys = Object.keys(this.unresolved);
  assert.equal(keys.length, 0,
               'Following names were used, but were not resolved: ' +
                  JSON.stringify(keys));
};
