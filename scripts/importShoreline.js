const fs = require("fs-extra");
const earcut = require("earcut");
const shoreline = require("../data/shoreline.json");

const lines = [];
const faces = [];
const combinedLines = [];
const appended = {};

shoreline.geometries.forEach((lineSegment, index) => {
	console.log(`Segment ${index}`);
	if (appended[index]) {
		console.log("Already appended");
		return; // Line segment was appended to a previous one
	}

	const { coordinates } = lineSegment;
	let closed =
		vertexKey(coordinates[0]) ===
		vertexKey(coordinates[coordinates.length - 1]);

	// Line is already closed, nothing to do
	if (closed) {
		console.log("Already closed");
		combinedLines.push(coordinates);
		appended[index] = true;
		return;
	}

	// Iterate through all line segments to find next segment,
	// until line is closed or no matching segments found
	let combinedLine = coordinates;
	let noMatch = false;
	while (!noMatch && !closed) {
		const startpointKey = vertexKey(combinedLine[0]);
		const endpointKey = vertexKey(combinedLine[combinedLine.length - 1]);
		closed = startpointKey === endpointKey;
		if (closed) {
			console.log("closed :)");
			return;
		}

		// Search all line segments to find next segment
		noMatch = true;
		shoreline.geometries.forEach((lineSegment2, index2) => {
			if (index2 === index) return; // Ignore current segment
			if (noMatch === false) return;
			if (appended[index2]) {
				return; // Line segment was appended to a previous one
			}
			const coordinates2 = lineSegment2.coordinates;
			const startpointKey2 = vertexKey(coordinates2[0]);
			const endpointKey2 = vertexKey(
				coordinates2[coordinates2.length - 1]
			);
			if (startpointKey2 === endpointKey2) return; // Ignore closed segments
			if (startpointKey2 === endpointKey) {
				console.log("Found match", index2);
				combinedLine.push(...coordinates2);
				appended[index2] = true;
				noMatch = false;
			}

			if (endpointKey2 === endpointKey) {
				appended[index2] = true;
				noMatch = false;
				console.log("Found reverse match", index2);
				combinedLine.push(...coordinates2.reverse());
			}

			if (startpointKey2 === startpointKey) {
				console.log("Found match", index2);
				combinedLine = [...coordinates2.reverse(), ...combinedLine];
				appended[index2] = true;
				noMatch = false;
			}

			if (endpointKey2 === startpointKey) {
				console.log("Found match", index2);
				combinedLine = [...coordinates2, ...combinedLine];
				appended[index2] = true;
				noMatch = false;
			}
		});

		if (noMatch) {
			console.log("No match :(");
		}
	}

	combinedLines.push(combinedLine);
});

// shoreline.geometries.forEach((line, index) => {
// 	let appended = false;
// 	combinedLines.forEach((vertices, index2) => {
// 		const threshold = 100;
// 		const start1 = line.coordinates[0];
// 		const end1 = line.coordinates[line.coordinates.length - 1];
// 		const start2 = vertices[0];
// 		const end2 = vertices[vertices.length - 1];
//
// 		const endStartDist = distance(end1, start2);
// 		const startStartDist = distance(start1, start2);
// 		const startEndDist = distance(start1, end2);
// 		const endEndDist = distance(end1, end2);
//
// 		if (endStartDist < threshold) {
// 			// combinedLines[index2] = [...line.coordinates, ...vertices];
// 			// appended = true;
// 			// console.log("es");
// 		} else if (startStartDist < threshold) {
// 			// if (appended) console.log("ss", index);
// 			// line.coordinates.reverse();
// 			// vertices = [...line.coordinates, ...vertices];
// 			// appended = true;
// 		} else if (endEndDist < threshold) {
// 			// if (appended) console.log("ee", index);
// 			// line.coordinates.reverse();
// 			// vertices.push(...line.coordinates);
// 			// appended = true;
// 		} else if (startEndDist < threshold) {
// 			// combinedLines[index2] = [...vertices, ...line.coordinates];
// 			// appended = true;
// 		}
// 	});
//
// 	if (!appended) {
// 		// const scaledCoords = line.coordinates.map(scale);
// 		combinedLines.push(line.coordinates);
// 		// lines.push(scaledCoords);
// 	}
// });

combinedLines.forEach((line, index) => {
	const scaledCoords = line.map(scale);
	combinedLines[index] = scaledCoords;
	const startpointKey = vertexKey(scaledCoords[0]);
	const endpointKey = vertexKey(scaledCoords[scaledCoords.length - 1]);

	const closed = startpointKey === endpointKey;
	// if (closed) {
	const vertices = line.reduce((acc, cur) => {
		acc.push(...cur);
		return acc;
	}, []);
	faces.push(earcut(vertices, null, 2).map(i => parseInt(i)));
	// } else {
	// 	faces.push([]);
	// }
});

console.log(`${combinedLines.length} lines`);

// shoreline.geometries.forEach((line, index) => {
// 	console.log(`Line ${index}, ${line.coordinates.length} coords`);
// 	const scaledCoords = line.coordinates.map(scale);
// 	const startpointKey = scaledCoords[0].join(",");
// 	const endpointKey = scaledCoords[scaledCoords.length - 1].join(",");
//
// 	const closed = startpointKey === endpointKey;
// 	if (closed) {
// 		console.log("Complete!");
// 		const vertices = line.coordinates.reduce((acc, cur) => {
// 			acc.push(...cur);
// 			return acc;
// 		}, []);
// 		faces.push(earcut(vertices, null, 2).map(i => parseInt(i)));
// 	} else {
// 		faces.push([]);
//
// 		//  || endpoints.has(endpointKey)) {
// 		// 	console.log("Completed loop :)");
// 		// 	console.log(
// 		// 		index,
// 		// 		endpoints.get(startpointKey),
// 		// 		endpoints.get(endpointKey)
// 		// 	);
// 		// }
// 	}
//
// 	lines.push(scaledCoords);
// 	// faces.push(earcut(scaledCoords.slice(0, 1000), null, 0));
// });

fs.outputJSON("./shoreline.json", combinedLines);
fs.outputJSON("./shorelineFaces.json", faces);

function vertexKey(vertex) {
	const precision = 1;
	return vertex.map(p => parseInt(p / precision) * precision).join(",");
}

function distance(vertex1, vertex2) {
	const xDiff = vertex1[0] - vertex2[0];
	const yDiff = vertex1[1] - vertex2[1];
	return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
}

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
