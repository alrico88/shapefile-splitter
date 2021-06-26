const rimraf = require('rimraf');

/**
 * Deletes a folder path
 *
 * @param {string} folderPath
 * @return {Promise<void>}
 */
function deleteFolder(folderPath) {
  return new Promise((resolve, reject) => {
    rimraf(folderPath, (err) => {
      if (!err) {
        resolve();
      } else {
        reject(err);
      }
    });
  });
}

module.exports.deleteFolder = deleteFolder;
