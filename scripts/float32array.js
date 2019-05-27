const lineReader = require("line-reader");
var fs = require("fs");

var writeStream = fs.createWriteStream("./buildings.dat");

const points = [];
let count = 0;
lineReader.eachLine("./data/buildings.json", function(line, last) {
	count += 1;
	if (count % 10000 === 0) {
		console.log(count);
	}

	const building = JSON.parse(line.substring(0, line.length - 1)); // trailing comma
	addPoints(building);

	if (count >= 100000 || last) {
		//prepare the length of the buffer to 4 bytes per float
		var buffer = new Buffer(points.length * 4);
		for (var i = 0; i < points.length; i++) {
			//write the float in Little-Endian and move the offset
			buffer.writeFloatLE(points[i], i * 4);
		}

		fs.writeFileSync(`./data${count}.data`, buffer);
		console.log(`${count} buildings`);
		return false;
	}
});

function addPoints(building) {
	const dupePoints = {};
	building.forEach((surface, index) => {
		for (var i = 0; i < surface.length; i++) {
			const point = pointFromVertex(surface[i]);
			const key = point.join(",");
			if (dupePoints[key]) continue;
			points.push(...pointFromVertex(surface[i]));
			dupePoints[key] = true;
		}
	});
}

function pointFromVertex(vertex) {
	return [
		mapLinear(vertex[1], 194479, 259992, 0, 65513) - 65513 / 2,
		mapLinear(vertex[2], -39.0158999999985, 1797.1066, 0, 1836),
		mapLinear(vertex[0], 978979, 1009996, 0, 31017) - 31017 / 2
	];
}

function mapLinear(x, a1, a2, b1, b2) {
	return b1 + ((x - a1) * (b2 - b1)) / (a2 - a1);
}
