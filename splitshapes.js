#!/usr/bin/env node

const shapefile = require('shapefile');
const ora = require('ora');
const orderBy = require('lodash/orderBy');
const removeDiacritics = require('remove-diacritics');
const fs = require('fs');
const homedir = require('os').homedir();
const path = require('path');
const getCleanPath = require('./helpers/path');
const {
  askForChoiceFilter,
  askForExtension,
  askForFilter,
  askForFilterType,
  askForFolder,
  askForInput,
  askForPropToFilter,
  askForPropertyToSplit,
  askForTextFilter,
} = require('./helpers/questions');
const FileWriter = require('./helpers/file');
const filterer = require('featurecollection-filterer');
const Logger = require('./helpers/logger');

/**
 * Gets GeoJSON file and properties
 *
 * @param {string} pathToRead
 * @returns {object}
 */
async function getGeoJSON(pathToRead) {
  const geoJSON = await readFile(pathToRead);
  const props = new Set();
  geoJSON.features.forEach((feature) => {
    Object.keys(feature.properties).forEach((prop) => {
      props.add(prop);
    });
  });
  return {
    props: [...props],
    map: geoJSON,
  };
}

/**
 * Reads shapefile and returns GeoJSON
 *
 * @param {string} pathToFile
 * @returns {Promise<GeoJSON.FeatureCollection>} GeoJSON
 */
function readFile(pathToFile) {
  try {
    return shapefile.read(pathToFile, undefined, {encoding: 'UTF-8'});
  } catch (err) {
    Logger.error('Error reading shape', err);
    throw err;
  }
}

/**
 * Creates base folder if it doesn't exist
 */
function createBaseFolder() {
  try {
    const pathToCheck = path.join(homedir, 'Shapefiles');
    if (!fs.existsSync(pathToCheck)) {
      fs.mkdirSync(pathToCheck);
    }
  } catch (err) {
    Logger.error('Error creating base folder');
    throw err;
  }
}

/**
 * Starts process
 *
 */
async function init() {
  try {
    Logger.clear();

    const file = await askForInput();
    const filePath = getCleanPath(file);

    const spinner = ora('Reading Shapefile').start();
    const geoJSON = await getGeoJSON(filePath);
    spinner.succeed('Converted SHP to GeoJSON');

    const propertyToSplitBy = await askForPropertyToSplit(geoJSON.props);
    const folderToPutFilesInto = await askForFolder();
    const extensionToUse = await askForExtension();

    const filterBool = (await askForFilter()) === 'Yes';

    if (filterBool) {
      const propToFilter = await askForPropToFilter(geoJSON.props);
      const filterType = await askForFilterType();

      if (filterType === 'From a list') {
        const valuesSpinner = ora('Getting unique property values').start();
        const uniqueValues = orderBy(
          [...new Set(geoJSON.map.features.map((feature) => feature.properties[propToFilter]))],
          (d) => removeDiacritics(d),
          'asc',
        );
        valuesSpinner.succeed('Read all possible values');
        const list = await askForChoiceFilter(uniqueValues);
        geoJSON.map.features = geoJSON.map.features.filter((feature) =>
          list.includes(feature.properties[propToFilter]));
      }

      if (filterType === 'By text') {
        const textFilter = await askForTextFilter();
        geoJSON.map.features = geoJSON.map.features.filter((feature) => {
          const value = feature.properties[propToFilter];
          if (value !== null) {
            const upperProp = value.toUpperCase();
            const upperCheck = textFilter.text.toUpperCase();
            return upperProp.includes(upperCheck);
          }
        });
      }
    }

    const start = new Date();

    // Get unique values for split
    const uniqueValues = [...new Set(geoJSON.map.features.map((d) => d.properties[propertyToSplitBy]))];

    const len = uniqueValues.length;

    const resultsPath = folderToPutFilesInto
      ? `${homedir}/Shapefiles/${folderToPutFilesInto}`
      : `${homedir}/Shapefiles`;

    createBaseFolder();
    if (!fs.existsSync(resultsPath)) {
      fs.mkdirSync(resultsPath);
    }

    const progressSpinner = ora(`Splitting file [0/${len}]`).start();

    const fileWriter = new FileWriter(
      resultsPath,
      extensionToUse,
      progressSpinner,
      len,
    );

    // Split feature to its own file
    for (let i = 0; i < len; i++) {
      const element = uniqueValues[i];
      fileWriter.writeFile(
        element,
        i,
        filterer(
          geoJSON.map,
          (d) => d.properties[propertyToSplitBy] === element,
        ),
      );
    }

    progressSpinner.succeed('Successfully split all files');

    endSummary(start, len, resultsPath);
  } catch (err) {
    Logger.error('Error processing file', err);
    process.exit(1);
  }
}

/**
 * Gives an ending summary of process
 *
 * @param {Date} start
 * @param {number} len
 * @param {string} resultsPath
 */
function endSummary(start, len, resultsPath) {
  const end = new Date();
  const time = end.getTime() - start.getTime();

  Logger.log('\n');
  Logger.log(`Processed ${len} files in ${time / 1000} s.\nSaved to ${resultsPath}`);
}

// Start script
init();
