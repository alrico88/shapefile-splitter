const ora = require('ora');
const {writeFileSync, readFileSync, readdirSync} = require('fs');
const uuid = require('uuid/v4');
const {deleteFolder} = require('./deletion');
const filenamify = require('filenamify');

/**
 * Checks if item is falsy
 *
 * @param {string} item
 * @returns {boolean}
 */
 function isFalsy(item) {
  return item === null || item === undefined || item === '';
}

class GeoJSONWriter {

  /**
   * Gets a filename for a feature name
   *
   * @param {string} elementName
   * @return {string}
   */
  static getFileName(elementName) {
   if (isFalsy(elementName)) {
     return uuid();
   } else {
     return filenamify(elementName);
   }
 }

  /**
   * Creates an instance of GeoJSONWriter
   *
   * @param {object} opts
   * @param {string} opts.destinationFolder The destination folder to write in
   * @param {string} opts.extension The extension for the files
   * @param {string} opts.tempFolder The temporary folder to write in
   */
  constructor({destinationFolder, extension, tempFolder}) {
    this.tempSpinner = null;
    this.writeSpinner = null;
    this.destinationFolder = destinationFolder;
    this.tempFolder = tempFolder;
    this.extension = extension;
    this.temp = 0;
    this.total = 0;
  }

  /**
   * Updates a spinner with given text
   *
   * @param {Ora} spinner
   * @param {string} newText
   */
  updateSpinner(spinner, newText) {
    spinner.text = newText;
    spinner.render();
  }

  /**
   * Appends a GeoJSON feature to a temp file
   *
   * @param {string} name
   * @param {object} feature
   */
  writeFeature(name, feature) {
    const filename = GeoJSONWriter.getFileName(name);
    const filepath = `${this.tempFolder}/${filename}.${this.extension}`;

    this.updateSpinner(this.tempSpinner, `Processing feature [${this.temp}]: ${filename}`);

    writeFileSync(
      filepath,
      `${JSON.stringify(feature)}\n`,
      {
        flag: 'a',
      },
    );

    this.temp++;
  }

  /**
   * Writes a FeatureCollection GeoJSON to destination folder
   * First reads the temp file and merges all features into FeatureCollection
   *
   * @param {string} filename
   * @return {Promise<void>}
   */
  writeFeatureCollection(filename) {
    return new Promise((resolve, reject) => {
      try {
        const tempFilePath = `${this.tempFolder}/${filename}`;

        const file = readFileSync(tempFilePath, {
          encoding: 'utf-8',
        });

        const asArray = file.trim().split('\n');

        const asFeatureCollection = {
          type: 'FeatureCollection',
          features: asArray.map((feature) => {
            try {
              return JSON.parse(feature);
            } catch (err) {
              console.error(err, feature);
              throw err;
            }
          }),
        };

        this.updateSpinner(this.writeSpinner, `Writing file ${this.total + 1}: ${filename}`);

        writeFileSync(
          `${this.destinationFolder}/${filename}`,
          JSON.stringify(asFeatureCollection),
        );

        this.total++;

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Starts the temporary writing progress spinner
   */
  startTempWrite() {
    this.tempSpinner = ora('Processing features').start();
  }

  /**
   * Ends the temporary writing progress spinner
   */
  endTempWrite() {
    this.tempSpinner.succeed(`Processed ${this.temp} features`);
  }

  /**
   * Starts the final writing progress spinner
   */
  startFinalWrite() {
    this.writeSpinner = ora('Writing files').start();
  }

  /**
   * Ends the final writing progress spinner
   * @return {Promise<number>}
   */
  async endFinalWrite() {
    this.writeSpinner.succeed(`Finished writing ${this.total} files`);

    await this.cleanTempDir();

    return this.total;
  }

  /**
   * Gets the filenames in temporary folder
   *
   * @return {string[]}
   */
  getTempFiles() {
    return readdirSync(this.tempFolder);
  }

  /**
   * Cleans the temporary folder
   *
   * @return {Promise<void>}
   */
  cleanTempDir() {
    return deleteFolder(this.tempFolder);
  }
}

module.exports.GeoJSONWriter = GeoJSONWriter;
