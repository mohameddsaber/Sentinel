const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCoreModule(relativePath, exportName) {
  const absPath = path.resolve(__dirname, '..', '..', relativePath);
  const code = fs.readFileSync(absPath, 'utf8');

  const context = {
    console,
    URL,
    RegExp,
    Object,
    Array,
    Math,
    JSON,
    Date,
    String,
    Number,
    Boolean,
    Error,
    TypeError,
    SyntaxError,
    parseInt,
    parseFloat,
    isFinite,
    isNaN,
    globalThis: {}
  };
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(code, context, { filename: absPath });

  if (!context[exportName]) {
    throw new Error(`Expected ${exportName} to be defined by ${relativePath}`);
  }

  return context[exportName];
}

module.exports = {
  loadCoreModule
};
