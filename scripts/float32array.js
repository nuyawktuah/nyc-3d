const lineReader = require("line-reader");
var fs = require("fs");
const earcut = require("earcut");
const ProgressBar = require("./ProgressBar");

try {
	fs.unlinkSync("faces.buffer");
	fs.unlinkSync("vertices.buffer");
} catch (err) {}
let verticesWriteStream = fs.createWriteStream("./buffers/vertices0.buffer");
let facesWriteStream = fs.createWriteStream("./buffers/faces0.buffer");

const vertexMap = new Map();
let currentVertex = 0;
let currentTile = 0;

let facesCount = 0;
let vertexCount = 0;

const TILE_SIZE = 256000;
const LIMIT = 1083437;

processBuildings();

function processBuildings() {
	let count = 0;
	const bar = new ProgressBar(LIMIT);
	bar.render();
	lineReader.eachLine("./data/buildings.json", function(line, last) {
		if (count % 1000 === 0) {
			bar.curr = count;
			bar.render();
		}
		count += 1;

		if (currentVertex > 0 && currentVertex > TILE_SIZE) {
			currentTile++;
			currentVertex = 0;
			facesCount = 0;
			vertexMap.clear();
			verticesWriteStream = fs.createWriteStream(
				`./buffers/vertices${currentTile}.buffer`
			);
			facesWriteStream = fs.createWriteStream(
				`./buffers/faces${currentTile}.buffer`
			);
		}

		const building = JSON.parse(line.substring(0, line.length - 1)); // trailing comma
		processBuilding(building);

		if (last) {
			return false;
		}
	});
}

function processBuilding(building) {
	building.forEach((rawFace, index) => {
		// Remove dupe last point
		const face = rawFace.slice(0, rawFace.length - 1);

		const vertices = face.reduce((acc, cur) => {
			acc.push(...cur);
			return acc;
		}, []);

		const triangles =
			face.length === 3
				? [0, 1, 2]
				: face.length === 4
				? [0, 1, 2, 0, 2, 3]
				: earcut(vertices, null, 3);

		const triangleIndices = triangles.map(i => {
			return vertexIndex(face[parseInt(i)]);
		});

		if (!triangleIndices.length) {
			console.log("Bad triangles", rawFace, vertices);
		}

		facesWriteStream.write(
			Buffer.from(Uint32Array.from(triangleIndices).buffer)
		);
		facesCount += triangleIndices.length;
	});
}

function vertexIndex(rawVertex) {
	const vertex = scaleVertex(rawVertex);
	const key = vertexKey(vertex);
	if (!vertexMap.has(key)) {
		vertexMap.set(key, currentVertex);
		verticesWriteStream.write(
			Buffer.from(Float32Array.from(vertex).buffer)
		);
		currentVertex++;
	}
	return vertexMap.get(key);
}

function vertexKey(vertex) {
	return vertex.map(float => float.toFixed(1)).join(";");
}

function scaleVertex(vertex) {
	return [
		mapLinear(vertex[1], 194479, 259992, 0, 65513) - 65513 / 2,
		mapLinear(vertex[2], -39.0158999999985, 1797.1066, 0, 1836),
		mapLinear(vertex[0], 978979, 1009996, 0, 31017) - 31017 / 2
	];
}

function mapLinear(x, a1, a2, b1, b2) {
	return b1 + ((x - a1) * (b2 - b1)) / (a2 - a1);
}
