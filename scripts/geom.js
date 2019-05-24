const fetch = require("node-fetch");

fetch(
	"http://localhost:8080/models/manhattan.indexed.building.triangles.binary"
).then(res => {
	console.log(res);
	const reader = res.body.getReader();
	reader.read().then(function processStream({ done, value }) {
		console.log(value);
		if (!done) return reader.read().then(processStream);
	});
});
