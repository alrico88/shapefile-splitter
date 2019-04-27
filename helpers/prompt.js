const inquirer = require('inquirer');

class Prompt {
	constructor() {
		this._createInquire = (opts) => inquirer.prompt([opts]);
	}

	/**
	 * Creates input prompt
	 *
	 * @param {string} name
	 * @param {string} message
	 * @param {string} [defaultValue=null]
	 * @returns {object}
	 * @memberof Prompt
	 */
	createInputPrompt(name, message, defaultValue = null) {
		const opts = {
			type: 'input',
			name: name,
			message: message,
		};
		if (defaultValue) {
			opts.default = defaultValue;
		}
		return this._createInquire(opts);
	}

	/**
	 * Creates list prompt
	 *
	 * @param {string} name
	 * @param {string} message
	 * @param {string[]} choices
	 * @returns {object}
	 * @memberof Prompt
	 */
	createListPrompt(name, message, choices) {
		const opts = {
			type: 'list',
			choices: choices,
			message: message,
			name: name,
		};
		return this._createInquire(opts);
	}

	/**
	 * Creates a checkbox prompt
	 *
	 * @param {string} name
	 * @param {string} message
	 * @param {string[]} choices
	 * @returns {Object}
	 * @memberof Prompt
	 */
	createCheckboxPrompt(name, message, choices) {
		const opts = {
			type: 'checkbox',
			choices: choices,
			message: message,
			name: name,
		};
		return this._createInquire(opts);
	}
}

module.exports = Prompt;
