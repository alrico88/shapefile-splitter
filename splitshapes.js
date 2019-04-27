#!/usr/bin/env node

const shapefile = require('shapefile');
const ora = require('ora');
const {orderBy, uniq, flatten} = require('lodash');
const removeDiacritics = require('remove-diacritics');
const fs = require('fs');
const homedir = require('os').homedir();
const path = require('path');
const getCleanPath = require('./helpers/path');
const Prompt = require('./helpers/prompt');
const FileWriter = require('./helpers/file');

const PromptCreator = new Prompt();

/**
 * Asks for input file
 */
async function askForInput() {
	try {
		return await PromptCreator.createInputPrompt(
			'path',
			`Path to shapefile to split`
		);
	} catch (err) {
		throw err;
	}
}

/**
 * Gets GeoJSON file and properties
 *
 * @param {string} pathToRead
 * @returns {object}
 */
async function getGeoJSON(pathToRead) {
	let geoJSON = await readFile(pathToRead);
	return {
		props: uniq(flatten(geoJSON.features.map((feature) => Object.keys(feature.properties)))),
		map: geoJSON,
	};
}

/**
 * Asks for prop to split by
 *
 * @param {string[]} props
 * @returns {Promise}
 */
async function askForPropertyToSplit(props) {
	try {
		return await PromptCreator.createListPrompt(
			'property',
			'Property to split by',
			props
		);
	} catch (err) {
		throw err;
	}
}

/**
 * Asks for folder to put files to
 */
async function askForFolder() {
	try {
		return await PromptCreator.createInputPrompt(
			'folder',
			'Folder to put split files in',
			''
		);
	} catch (err) {
		throw err;
	}
}

/**
 * Asks for file extension to use
 */
async function askForExtension() {
	try {
		return await PromptCreator.createListPrompt(
			'extension',
			'Choose the file extension to use',
			['json', 'geojson']
		);
	} catch (err) {
		throw err;
	}
}

/**
 * Ask if user wants to apply filter to properties to split
 *
 * @returns {Promise}
 */
async function askForFilter() {
	try {
		return await PromptCreator.createListPrompt(
			'filter',
			'Do you want to filter the properties to split?',
			['Yes', 'No']
		);
	} catch (err) {
		throw err;
	}
}

/**
 * Asks for filter type
 *
 * @returns {Promise}
 */
async function askForFilterType() {
	try {
		return await PromptCreator.createListPrompt(
			'choice',
			'Do you want to filter the properties to split?',
			['From a list', 'By text']
		);
	} catch (err) {
		throw err;
	}
}

/**
 * Asks for a prop to filter by
 *
 * @param {string[]} propTypes
 * @returns {Promise}
 */
async function askForPropToFilter(propTypes) {
	try {
		return await PromptCreator.createListPrompt(
			'choice',
			'Which property values would you like to filter?',
			propTypes
		);
	} catch (err) {
		throw err;
	}
}

/**
 * Asks for a list to choose from multiple prop values
 *
 * @param {string[]} propValues
 * @returns {Promise}
 */
async function askForChoiceFilter(propValues) {
	try {
		return await PromptCreator.createCheckboxPrompt(
			'selection',
			'Choose which values to split',
			propValues
		);
	} catch (err) {
		throw err;
	}
}

/**
 * Asks for input to filter by text
 *
 * @returns {Promise}
 */
async function askForTextFilter() {
	try {
		return await PromptCreator.createInputPrompt('text', 'Enter a text filter');
	} catch (err) {
		throw err;
	}
}

/**
 * Reads shapefile and returns GeoJSON
 *
 * @param {string} pathToFile
 * @returns {object} GeoJSON
 */
async function readFile(pathToFile) {
	try {
		return await shapefile.read(pathToFile, undefined, {encoding: 'UTF-8'});
	} catch (err) {
		console.error('Error reading shape', err);
		throw err;
	}
}

/**
 * Creates base folder if it doesn't exist
 */
function createBaseFolder() {
	try {
		let pathToCheck = path.join(homedir, 'Shapefiles');
		if (!fs.existsSync(pathToCheck)) {
			fs.mkdirSync(pathToCheck);
		}
	} catch (err) {
		console.error('Error creating base folder');
		throw err;
	}
}

/**
 * Starts process
 *
 */
async function init() {
	try {
		console.clear();

		const file = await askForInput();
		const filePath = getCleanPath(file.path);

		const spinner = ora('Reading Shapefile').start();
		const geoJSON = await getGeoJSON(filePath);
		spinner.succeed('Converted SHP to GeoJSON');

		const propAnswer = await askForPropertyToSplit(geoJSON.props);
		const propertyToSplitBy = propAnswer.property;
		const folderAnswer = await askForFolder();
		const extensionAnswer = await askForExtension();
		const extensionToUse = extensionAnswer.extension;

		const filterAnswer = await askForFilter();
		const filterBool = filterAnswer.filter === 'Yes';

		if (filterBool) {
			const propFilterAnswer = await askForPropToFilter(geoJSON.props);
			const propToFilter = propFilterAnswer.choice;
			const filterType = await askForFilterType();
			let userChose;

			switch (filterType.choice) {
				case 'From a list':
					userChose = 'list';
					break;
				case 'By text':
					userChose = 'text';
					break;
				default:
					break;
			}

			if (userChose === 'list') {
				const valuesSpinner = ora('Getting unique property values').start();
				const values = geoJSON.map.features.map((feature) => feature.properties[propToFilter]);
				const uniqueValues = orderBy(
					uniq(values),
					(d) => removeDiacritics(d),
					'asc'
				);
				valuesSpinner.succeed('Read all possible values');
				const list = await askForChoiceFilter(uniqueValues);
				geoJSON.map.features = geoJSON.map.features.filter((feature) =>
					list.selection.includes(feature.properties[propToFilter]));
			}

			if (userChose === 'text') {
				let textFilter = await askForTextFilter();
				geoJSON.map.features = geoJSON.map.features.filter((feature) => {
					let value = feature.properties[propToFilter];
					if (value !== null) {
						let upperProp = feature.properties[propToFilter].toUpperCase();
						let upperCheck = textFilter.text.toUpperCase();
						return upperProp.includes(upperCheck);
					}
				});
			}
		}

		const start = new Date();

		// Get unique values for split
		const uniqueValues = uniq(geoJSON.map.features.map((d) => d.properties[propertyToSplitBy]));

		const len = uniqueValues.length;

		const folderToPutFilesInto = folderAnswer.folder;

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
			len
		);

		// Split feature to its own file
		for (let i = 0; i < len; i++) {
			let element = uniqueValues[i];
			fileWriter.writeFile(element, i, {
				type: 'FeatureCollection',
				features: geoJSON.map.features.filter((d) => d.properties[propertyToSplitBy] === element),
			});
		}

		progressSpinner.succeed(`Successfully split all files`);

		endSummary(start, len, resultsPath);
	} catch (err) {
		console.log('Error processing file', err);
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

	console.log('\n');
	console.log(`Processed ${len} files in ${time / 1000} s.\nSaved to ${resultsPath}`);
}

// Start script
init();
