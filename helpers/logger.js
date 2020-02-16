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

module.exports = Logger;
