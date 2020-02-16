const fs = require('fs');
const uuid = require('uuid/v4');
const replace = require('lodash/replace');

/**
 * Checks if item is falsy
 *
 * @param {string} item
 * @returns {boolean}
 */
function isFalsy(item) {
  return item === null || item === undefined || item === '';
}

class FileWriter {

  /**
   *Creates an instance of FileWriter.
   * @param {string} resultsPath
   * @param {string} extensionToUse
   * @param {object} progressSpinner
   * @param {number} total
   * @memberof FileWriter
   */
  constructor(resultsPath, extensionToUse, progressSpinner, total) {
    this.resultsPath = resultsPath;
    this.extensionToUse = extensionToUse;
    this.progressSpinner = progressSpinner;
    this.total = total;

    /**
     * Gets clean name for file
     *
     * @private
     * @param {string} [elementName]
     */
    this._getName = (elementName) => {
      if (isFalsy(elementName)) {
        return uuid();
      } else {
        const string = elementName.toString();
        return string.includes('/') ? replace(string, /\//g, '-') : string;
      }
    };
  }

  /**
   * Writes content to file
   *
   * @param {string} element
   * @param {number} index
   * @param {object} resultingGeoJSON
   * @memberof FileWriter
   */
  writeFile(element, index, resultingGeoJSON) {
    const filename = this._getName(element);
    this.progressSpinner.text = `Splitting file [${index}/${this.total}]: ${element}`;
    this.progressSpinner.render();

    fs.writeFileSync(
      `${this.resultsPath}/${filename}.${this.extensionToUse}`,
      JSON.stringify(resultingGeoJSON),
    );
  }
}

module.exports = FileWriter;
