const Prompt = require('./prompt');

/**
 * Asks for input file
 *
 * @returns {Promise<string>}
 */
async function askForInput() {
  const response = await Prompt.createInputPrompt('Path to shapefile to split');

  return response.result;
}

/**
 * Asks for prop to split by
 *
 * @param {string[]} props
 * @returns {Promise<string>}
 */
async function askForPropertyToSplit(props) {
  const response = await Prompt.createListPrompt('Property to split by', props);

  return response.result;
}

/**
 * Asks for folder to put files to
 *
 * @returns {Promise<string>}
 */
async function askForFolder() {
  const response = await Prompt.createInputPrompt(
    'Folder to put split files in',
    '',
  );

  return response.result;
}

/**
 * Asks for file extension to use
 *
 * @returns {Promise<string>}
 */
async function askForExtension() {
  const response = await Prompt.createListPrompt(
    'Choose the file extension to use',
    ['json', 'geojson'],
  );

  return response.result;
}

/**
 * Ask if user wants to apply filter to properties to split
 *
 * @returns {Promise<string>}
 */
async function askForFilter() {
  const response = await Prompt.createListPrompt(
    'Do you want to filter the properties to split?',
    ['Yes', 'No'],
  );

  return response.result;
}

/**
 * Asks for filter type
 *
 * @returns {Promise<string>}
 */
async function askForFilterType() {
  const response = await Prompt.createListPrompt(
    'Do you want to filter the properties to split?',
    ['From a list', 'By text'],
  );

  return response.result;
}

/**
 * Asks for a prop to filter by
 *
 * @param {string[]} propTypes
 * @returns {Promise<string>}
 */
async function askForPropToFilter(propTypes) {
  const response = await Prompt.createListPrompt(
    'Which property values would you like to filter?',
    propTypes,
  );

  return response.result;
}

/**
 * Asks for a list to choose from multiple prop values
 *
 * @param {string[]} propValues
 * @returns {Promise<string[]>}
 */
async function askForChoiceFilter(propValues) {
  const response = await Prompt.createCheckboxPrompt(
    'Choose which values to split',
    propValues,
  );

  return response.result;
}

/**
 * Asks for input to filter by text
 *
 * @returns {Promise<string>}
 */
async function askForTextFilter() {
  const response = await Prompt.createInputPrompt('Enter a text filter (multiple values with ,)');

  return response.result;
}

module.exports = {
  askForChoiceFilter,
  askForExtension,
  askForFilter,
  askForFilterType,
  askForFolder,
  askForInput,
  askForPropertyToSplit,
  askForPropToFilter,
  askForTextFilter,
};
