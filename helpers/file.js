const fs = require('fs');

class FileWriter {
	constructor(resultsPath, extensionToUse, progressSpinner, total) {
		this.resultsPath = resultsPath;
		this.extensionToUse = extensionToUse;
		this.progressSpinner = progressSpinner;
		this.total = total;
	}

	writeFile(element, index, resultingGeoJSON) {
		// Protection against "/" in file paths
		let filename = element.toString().includes('/')
			? element
					.toString()
					.split('/')
					.join('-')
			: element.toString();

		this.progressSpinner.text = `Splitting file [${index}/${
			this.total
		}]: ${element}`;
		this.progressSpinner.render();

		let fileContent = JSON.stringify(resultingGeoJSON);
		fs.writeFileSync(
			`${this.resultsPath}/${filename}.${this.extensionToUse}`,
			fileContent
		);
	}
}

module.exports = FileWriter;
