const path = require('path');
const replace = require('lodash/replace');

/**
 * Gets clean path from any string
 *
 * @param {string} uglyPath
 * @returns {string}
 */
function getCleanPath(uglyPath) {
  const normPath = replace(uglyPath, /\\/g, '/');

  const normQuotes = replace(normPath, /"/g, '');

  return path.normalize(normQuotes.trim());
}

module.exports = getCleanPath;
