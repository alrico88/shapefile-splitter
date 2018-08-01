#!/usr/bin/env node

const shapefile = require('shapefile');
const ora = require('ora');
const inquirer = require('inquirer');
const fs = require('fs');
const homedir = require('os').homedir();
const path = require('path');
const getCleanPath = require('./helpers/path');

/**
 * Asks for input file
 */
async function askForInput() {
	try {
		return await inquirer.prompt([
			{
				type: 'input',
				name: 'path',
				message: `Path to shapefile to split`,
			},
		]);
	} catch (err) {
		throw err;
	}
}

/**
 * Gets GeoJSON file and properties
 *
 * @param {string} path
 * @returns {object}
 */
async function getGeoJSON(path) {
	let geoJSON = await readFile(path);

	let props = [];

	for (let feature of geoJSON.features) {
		Object.keys(feature.properties).map((property) => {
			if (!props.includes(property)) {
				props.push(property);
			}
		});
	}

	return {
		props: props,
		map: geoJSON,
	};
}

async function askForPropertyToSplit(props) {
	try {
		return await inquirer.prompt([
			{
				type: 'list',
				name: 'property',
				choices: props,
				message: 'Property to split by',
			},
		]);
	} catch (err) {
		throw err;
	}
}

/**
 * Asks for folder to put files to
 */
async function askForFolder() {
	try {
		return await inquirer.prompt([
			{
				type: 'input',
				name: 'folder',
				message: 'Folder to put split files in',
				default: '',
			},
		]);
	} catch (err) {
		throw err;
	}
}

/**
 * Asks for file extension to use
 */
async function askForExtension() {
	try {
		return await inquirer.prompt([
			{
				type: 'list',
				choices: ['json', 'geojson'],
				message: 'Choose the file extension to use',
				name: 'extension',
			},
		]);
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
		return await inquirer.prompt([
			{
				type: 'list',
				choices: ['Yes', 'No'],
				message: 'Do you want to filter the properties to split?',
				name: 'filter',
			},
		]);
	} catch (err) {
		throw err;
	}
}

async function askForFilterType() {
	try {
		return await inquirer.prompt([
			{
				type: 'list',
				choices: ['From a list', 'By text'],
				message: 'Do you want to filter the properties to split?',
				name: 'choice',
			},
		]);
	} catch (err) {
		throw err;
	}
}

async function askForChoiceFilter(propValues) {
	try {
		return await inquirer.prompt([
			{
				type: 'checkbox',
				choices: propValues,
				message: 'Choose which values to split',
				name: 'selection',
			},
		]);
	} catch (err) {
		throw err;
	}
}

async function askForTextFilter() {
	try {
		return await inquirer.prompt([
			{
				type: 'input',
				message: 'Enter a text filter',
				name: 'text',
			},
		]);
	} catch (err) {
		throw err;
	}
}

/**
 * Reads shapefile and returns GeoJSON
 *
 * @param {string} path
 * @returns {object} GeoJSON
 */
async function readFile(path) {
	try {
		return await shapefile.read(path, undefined, {encoding: 'UTF-8'});
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

		let file = await askForInput();
		let filePath = getCleanPath(file.path);

		let spinner = ora('Reading Shapefile').start();
		let geoJSON = await getGeoJSON(filePath);
		spinner.succeed('Converted SHP to GeoJSON');

		let propAnswer = await askForPropertyToSplit(geoJSON.props);
		let propertyToSplitBy = propAnswer.property;
		let folderAnswer = await askForFolder();
		let extensionAnswer = await askForExtension();
		let extensionToUse = extensionAnswer.extension;

		let filterAnswer = await askForFilter();
		let filterBool = filterAnswer.filter === 'Yes';

		if (filterBool) {
			let filterType = await askForFilterType();
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
				let valuesSpinner = ora('Getting unique property values').start();
				let values = geoJSON.map.features.map((feature) => feature.properties[propertyToSplitBy]);
				let uniqueValues = [...new Set(values)].sort(Intl.Collator().compare());
				valuesSpinner.succeed('Read all possible values');
				let list = await askForChoiceFilter(uniqueValues);
				geoJSON.map.features = geoJSON.map.features.filter((feature) =>
					list.selection.includes(feature.properties[propertyToSplitBy]));
			}

			if (userChose === 'text') {
				let textFilter = await askForTextFilter();
				geoJSON.map.features = geoJSON.map.features.filter((feature) => {
					let value = feature.properties[propertyToSplitBy];
					if (value !== null) {
						let upperProp = feature.properties[propertyToSplitBy].toUpperCase();
						let upperCheck = textFilter.text.toUpperCase();
						return upperProp.includes(upperCheck);
					}
				});
			}
		}

		let start = new Date();

		// Get unique values for split
		let uniqueValues = [];

		for (let feature of geoJSON.map.features) {
			let propToLookFor = feature.properties[propertyToSplitBy];
			if (propToLookFor !== null && !uniqueValues.includes(propToLookFor)) {
				uniqueValues.push(propToLookFor);
			}
		}

		let len = uniqueValues.length;

		let folderToPutFilesInto = folderAnswer.folder;

		let resultsPath = folderToPutFilesInto
			? `${homedir}/Shapefiles/${folderToPutFilesInto}`
			: `${homedir}/Shapefiles`;

		createBaseFolder();
		if (!fs.existsSync(resultsPath)) {
			fs.mkdirSync(resultsPath);
		}

		let progressSpinner = ora(`Splitting file [0/${len}]`).start();

		// Split feature to its own file
		for (let i = 0; i < len; i++) {
			let element = uniqueValues[i];
			let resultingGeoJSON = {
				type: 'FeatureCollection',
				features: geoJSON.map.features.filter((d) => d.properties[propertyToSplitBy] === element),
			};

			// Protection against "/" in file paths
			let filename = element.toString().includes('/')
				? element
						.toString()
						.split('/')
						.join('-')
				: element.toString();

			progressSpinner.text = `Splitting file [${i}/${len}]: ${element}`;
			progressSpinner.render();

			let fileContent = JSON.stringify(resultingGeoJSON);
			fs.writeFileSync(
				`${resultsPath}/${filename}.${extensionToUse}`,
				fileContent
			);
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
	let end = new Date();
	let time = end.getTime() - start.getTime();

	console.log('\n');
	console.log(`Processed ${len} files in ${time / 1000} s.\nSaved to ${resultsPath}`);
}

// Start script
init();
