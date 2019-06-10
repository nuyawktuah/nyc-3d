const fs = require("fs-extra");
const earcut = require("earcut");
const shoreline = require("../data/shoreline.json");

const lines = [];
const faces = [];
const endpoints = new Map();

shoreline.geometries.forEach((line, index) => {
	const scaledCoords = line.coordinates.map(scale);
	const startpointKey = scaledCoords[0].join(",");
	const endpointKey = scaledCoords[scaledCoords.length - 1].join(",");

	if (!endpoints.has(endpointKey)) {
		endpoints.set(endpointKey, index);
	}

	if (!endpoints.has(startpointKey)) {
		endpoints.set(startpointKey, index);
	}
});

shoreline.geometries.forEach((line, index) => {
	console.log(`Line ${index}, ${line.coordinates.length} coords`);
	const scaledCoords = line.coordinates.map(scale);
	const startpointKey = scaledCoords[0].join(",");
	const endpointKey = scaledCoords[scaledCoords.length - 1].join(",");

	const closed = startpointKey === endpointKey;
	if (closed) {
		console.log("Complete!");
		const vertices = line.coordinates.reduce((acc, cur) => {
			acc.push(...cur);
			return acc;
		}, []);
		faces.push(earcut(vertices, null, 2).map(i => parseInt(i)));
	} else {
		faces.push([]);
	}

	if (endpoints.has(startpointKey) || endpoints.has(endpointKey)) {
		console.log("Completed loop :)");
		console.log(
			index,
			endpoints.get(startpointKey),
			endpoints.get(endpointKey)
		);
	}

	lines.push(scaledCoords);
	// faces.push(earcut(scaledCoords.slice(0, 1000), null, 0));
});

fs.outputJSON("./shoreline.json", lines);
fs.outputJSON("./shorelineFaces.json", faces);

function scale(coordinates) {
	return [
		mapLinear(coordinates[1], 194479, 259992, 0, 65513) - 65513 / 2,
		0,
		mapLinear(coordinates[0], 978979, 1009996, 0, 31017) - 31017 / 2
	];
}

function mapLinear(x, a1, a2, b1, b2) {
	return b1 + ((x - a1) * (b2 - b1)) / (a2 - a1);
}
