'use strict';

exports.fn2str = function fn2str(fn) {
  return fn.toString().replace(/^function[^{]+{\/\*|\*\/}$/g, '');
};
