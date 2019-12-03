const path = require('path');

function getCleanPath(uglyPath) {
  let newPath = uglyPath.trim();

  if (newPath.includes('.shp')) {
    newPath = newPath.split('.shp').join('');
  }

  if (newPath.includes('"')) {
    newPath = newPath.split('"').join('');
  }

  if (newPath.includes('\'')) {
    newPath = newPath.split('\'').join('');
  }

  return newPath;
}

module.exports = getCleanPath;
