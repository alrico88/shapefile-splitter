const prettyMs = require('pretty-ms');

class Logger {
  static clear() {
    console.clear();
  }

  static log(...args) {
    console.log(...args);
  }

  static error(...args) {
    console.error(...args);
  }
}

/**
 * Converts ms to text
 * @param {number} ms
 * @return {string | *}
 */
function msToText(ms) {
  return prettyMs(ms);
}

module.exports.Logger = Logger;
module.exports.msToText = msToText;
