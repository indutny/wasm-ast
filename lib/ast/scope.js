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
}
module.exports = Scope;

Scope.prototype.assign = function assign(name, type) {
  assert(!this.map.hasOwnProperty(name), 'Failed to redeclare: ' + name);
  var res = {
    type: type,
    index: this.indexes[type]++
  };
  this.map[name] = res;
  return res;
};

Scope.prototype.lookup = function lookup(name) {
  var current = this;
  while (current !== null && !current.map.hasOwnProperty(name))
    current = current.parent;

  assert(current !== null, 'Failed to lookup: ' + name);
  return current.map[name];
};

Scope.prototype.localCount = function localCount() {
  return this.indexes.Local;
};
