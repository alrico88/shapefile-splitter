const shapefile = require('shapefile');
const get = require('lodash/get');

class ShapefileReader {

  /**
   * Creates an instance of ShapefileReader
   *
   * @param {string} pathToFile
   */
  constructor(pathToFile) {
    this.pathToFile = pathToFile;
  }

  /**
   * Gets a shapefile source to read as a stream
   *
   * @return {Promise<Shapefile>}
   */
  getSource() {
    return shapefile.open(this.pathToFile, undefined, {
      encoding: 'utf-8',
    });
  }

  /**
   * Reads first feature's property keys
   *
   * @return {Promise<string[]>}
   */
  async readProps() {
    const source = await this.getSource();

    const firstRecord = await source.read();

    return Object.keys(firstRecord.value.properties).sort(Intl.Collator().compare);
  }

  /**
   * Reads all features and executes a function for each one
   *
   * @param {Function} onEachFeature
   * @return {Promise<void>}
   */
  async readFeatures(onEachFeature) {
    const source = await this.getSource();

    let isFinished = false;

    while (!isFinished) {
      const {done, value} = await source.read();

      if (done) {
        isFinished = true;
      }

      if (value) {
        onEachFeature(value);
      }
    }
  }

  /**
   * Gets all possible unique values for a certain property key
   *
   * @param {string} prop
   * @return {Promise<any[]>}
   */
  async readPropUniqueValues(prop) {
    const propValues = new Set();

    await this.readFeatures((feature) => {
      const propValue = get(feature.properties, prop);

        if (propValue) {
          propValues.add(propValue);
        }
    });

    return Array.from(propValues).sort(Intl.Collator().compare);
  }
}

module.exports = {
  ShapefileReader,
};
