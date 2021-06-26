const inquirer = require('inquirer');

class Prompt {

  /**
   * Creates a prompt
   *
   * @private
   * @static
   * @param {{type: string, message: string, [choices]: string[]}} opts
   * @returns {Promise<*>}
   * @memberof Prompt
   */
  static _createInquire(opts) {
    opts.name = 'result';

    return inquirer.prompt([opts]);
  }

  /**
   * Creates input prompt
   *
   * @param {string} message
   * @param {string} [defaultValue=null]
   * @returns {object}
   * @memberof Prompt
   */
  static createInputPrompt(message, defaultValue = null) {
    const opts = {
      type: 'input',
      message,
    };

    if (defaultValue) {
      opts.default = defaultValue;
    }

    return Prompt._createInquire(opts);
  }

  /**
   * Creates list prompt
   *
   * @param {string} message
   * @param {string[]} choices
   * @returns {object}
   * @memberof Prompt
   */
  static createListPrompt(message, choices) {
    const opts = {
      type: 'list',
      choices,
      message,
    };


    return Prompt._createInquire(opts);
  }

  /**
   * Creates a checkbox prompt
   *
   * @param {string} message
   * @param {string[]} choices
   * @returns {Object}
   * @memberof Prompt
   */
  static createCheckboxPrompt(message, choices) {
    const opts = {
      type: 'checkbox',
      choices,
      message,
    };


    return Prompt._createInquire(opts);
  }
}

module.exports = Prompt;
