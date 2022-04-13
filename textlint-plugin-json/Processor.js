const { parse } = require('./json-to-ast');

module.exports = class TextProcessor {
  constructor(config = {}) {
    this.config = config;
    this.extensions = config.extensions ? config.extensions : [];
  }
  availableExtensions() {
    return ['.json'].concat(this.extensions);
  }
  processor() {
    return {
      preProcess(text) {
        return parse(text);
      },
      postProcess(messages, filePath) {
        return {
          messages,
          filePath: filePath ? filePath : '<json>',
        };
      },
    };
  }
};
