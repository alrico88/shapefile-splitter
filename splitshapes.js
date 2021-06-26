#!/usr/bin/env node

const ora = require('ora');
const {existsSync, mkdirSync} = require('fs');
const homedir = require('os').homedir();
const path = require('path');
const getCleanPath = require('./helpers/path');
const questions = require('./helpers/questions');
const {Logger, msToText} = require('./helpers/logger');
const {ShapefileReader} = require('./helpers/reader');
const get = require('lodash/get');
const {GeoJSONWriter} = require('./helpers/writer');
const tempy = require('tempy');
const promiseConcurrency = require('promise-concurrency');
const {deleteFolder} = require('./helpers/deletion');

let tempFolder;

/**
 * Creates base folder if it doesn't exist
 */
function createBaseFolder() {
  try {
    const pathToCheck = path.join(homedir, 'Shapefiles');

    if (!existsSync(pathToCheck)) {
      mkdirSync(pathToCheck);
    }
  } catch (err) {
    Logger.error('Error creating base folder');
    throw err;
  }
}

/**
 * Gets the function to filter from a list
 *
 * @param {ShapefileReader} shapeReader
 * @param {string} propToFilter
 * @return {Promise<function(*): boolean>}
 */
async function getListFilterFunc(shapeReader, propToFilter) {
  const valuesSpinner = ora('Getting unique property values').start();
  const uniqueValues = await shapeReader.readPropUniqueValues(propToFilter);

  valuesSpinner.succeed('Read all possible values');
  const list = await questions.askForChoiceFilter(uniqueValues);

  return function(feature) {
    return list.includes(feature.properties[propToFilter]);
  };
}

/**
 * Gets the function to filter by text
 *
 * @param {ShapefileReader} shapeReader
 * @param {string} propToFilter
 * @return {Promise<(function(*): (*|boolean))|*>}
 */
async function getTextFilterFunc(shapeReader, propToFilter) {
  const textFilter = await questions.askForTextFilter();

  const textArray = textFilter.trim().split(',').map((d) => d.trim().toUpperCase());

  return function (feature) {
    const propValue = get(feature.properties, propToFilter);

    if (propValue !== null) {
      const upperProp = propValue.toUpperCase();

      return textArray.some((word) => upperProp.includes(word));
    } else {
      return false;
    }
  };
}

/**
 * Starts process
 */
async function init() {
  try {
    Logger.clear();

    const file = await questions.askForInput();
    const filePath = getCleanPath(file);

    const spinner = ora('Reading Shapefile').start();

    const shapeReader = new ShapefileReader(filePath);

    const props = await shapeReader.readProps();

    spinner.succeed('Read available features properties');

    const propertyToSplitBy = await questions.askForPropertyToSplit(props);
    const folderToPutFilesInto = await questions.askForFolder();
    const extensionToUse = await questions.askForExtension();

    const filterBool = (await questions.askForFilter()) === 'Yes';

    let filterFunc;

    if (filterBool) {
      const propToFilter = await questions.askForPropToFilter(props);
      const filterType = await questions.askForFilterType();

      if (filterType === 'From a list') {
        filterFunc = await getListFilterFunc(shapeReader, propToFilter);
      }

      if (filterType === 'By text') {
        filterFunc = await getTextFilterFunc(shapeReader, propToFilter);
      }
    }

    const start = new Date();

    const resultsPath = folderToPutFilesInto
      ? `${homedir}/Shapefiles/${folderToPutFilesInto}`
      : `${homedir}/Shapefiles`;

    createBaseFolder();
    if (!existsSync(resultsPath)) {
      mkdirSync(resultsPath);
    }

    tempFolder = await tempy.directory();

    const geoJSONWriter = new GeoJSONWriter({
      tempFolder,
      destinationFolder: resultsPath,
      extension: extensionToUse,
    });

    geoJSONWriter.startTempWrite();

    await shapeReader.readFeatures((feature) => {
      if (filterFunc) {
        if (!filterFunc(feature)) {
          return;
        }
      }

      geoJSONWriter.writeFeature(feature.properties[propertyToSplitBy], feature);
    });

    geoJSONWriter.endTempWrite();

    const files = geoJSONWriter.getTempFiles();

    const promises = files.map((featurePath) => () => geoJSONWriter.writeFeatureCollection(featurePath));

    geoJSONWriter.startFinalWrite();

    await promiseConcurrency(promises, 10);

    const total = await geoJSONWriter.endFinalWrite();

    endSummary(start, total, resultsPath);
  } catch (err) {
    Logger.error('Error processing file', err);

    if (tempFolder) {
      await deleteFolder(tempFolder);
    }

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
  Logger.log(`Processed ${len} files in ${msToText(time)}\nSaved to ${resultsPath}`);
}

// Start script
init();
