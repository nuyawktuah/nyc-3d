// Scene
var scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf5f5f5, 1, 10000000);

// Renderer
var renderer = new THREE.WebGLRenderer({
	powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(scene.fog.color, 1);
renderer.gammaInput = true;
renderer.gammaOutput = true;
document.body.appendChild(renderer.domElement);

const [camera, controls] = renderCamera();
renderLights();
const stats = renderStats();
renderShoreline();
// renderShoreline2();
renderBuildings();
renderNodes();

animate();

async function renderBuildings() {
	const buildingsMaterial = new THREE.MeshPhongMaterial({
		side: THREE.DoubleSide,
		flatShading: THREE.FlatShading
	});

	let faceCount = 0;
	for (var i = 78; i >= 0; i--) {
		try {
			await renderBuffers(i);
		} catch (error) {
			console.error(error);
		}
	}
	console.log(faceCount);

	async function renderBuffers(index) {
		const verticesBuffer = await fetchBuffer(`vertices${index}.buffer`);
		const vertices = new Float32Array(verticesBuffer);
		const facesBuffer = await fetchBuffer(`faces${index}.buffer`);
		const faces = new Uint32Array(facesBuffer);
		faceCount += faces.length;

		const buildingsGeom = new THREE.BufferGeometry();
		buildingsGeom.addAttribute(
			"position",
			new THREE.BufferAttribute(vertices, 3)
		);
		buildingsGeom.setIndex(new THREE.BufferAttribute(faces, 3));
		buildingsGeom.matrixAutoUpdate = false;

		// const colorArray = new Array(faces.length);
		// for (var i = 0; i < colorArray.length - 2; i += 3) {
		// 	colorArray[i] = 255;
		// 	colorArray[i + 1] = i % 100 < 10 ? 0 : 255;
		// 	colorArray[i + 2] = i % 100 < 10 ? 0 : 255;
		// }
		// const colorBuffer = Uint8Array.from(colorArray);
		// buildingsGeom.addAttribute(
		// 	"color",
		// 	new THREE.BufferAttribute(colorBuffer, 3, true)
		// );

		const buildingsMesh = new THREE.Mesh(
			buildingsGeom.toNonIndexed(),
			buildingsMaterial
		);
		scene.add(buildingsMesh);
	}

	function fetchBuffer(file) {
		return fetch(`./buffers/${file}`).then(res => res.arrayBuffer());
	}
}

async function renderNodes() {
	const nodesRes = await fetch("/data/nodes.json");
	const nodes = await nodesRes.json();
	const linksRes = await fetch("https://node-db.netlify.com/links.json");
	const links = await linksRes.json();

	const nodesById = nodes.reduce((acc, cur) => {
		acc[cur.id] = cur;
		return acc;
	}, {});

	console.log(nodesById);

	links.forEach(link => {
		const node1 = nodesById[link.from];
		const node2 = nodesById[link.to];
		if (!node1 || !node2) return;
		console.log("rendered link");
		if (link.status !== "active") return;
		const status1 = nodeStatus(node1);
		const status2 = nodeStatus(node2);
		const backboneLink =
			["supernode", "hub"].includes(status1) &&
			["supernode", "hub"].includes(status2);
		const color = backboneLink ? 0x0000ff : 0xff0000;
		const opacity = backboneLink ? 0.75 : 0.5;
		renderLink(node1.coordinates, node2.coordinates, color, opacity);
	});

	function nodeStatus(node) {
		const { status, notes = "", tickets, panoramas } = node;
		const isActive = status === "Installed";
		const isSupernode = notes.toLowerCase().indexOf("supernode") > -1;
		const isHub = notes.toLowerCase().indexOf("hub") > -1;
		const isResponsive = tickets && tickets.length > 2;
		const hasPanoramas = panoramas && panoramas.length;

		if (isActive) {
			if (isSupernode) return "supernode";
			if (isHub) return "hub";
			return "active";
		}

		if (isSupernode) return "potential-supernode";
		if (isHub) return "potential-hub";
		if (isResponsive || hasPanoramas) return "potential";
		return "dead";
	}
}

async function renderLink(startPoint, endPoint, color, opacity) {
	function LineCurve(scale) {
		THREE.Curve.call(this);
		this.scale = scale === undefined ? 1 : scale;
		this.startPoint = scaleVertex(startPoint);
		this.endPoint = scaleVertex(endPoint);

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
	}

	LineCurve.prototype = Object.create(THREE.Curve.prototype);
	LineCurve.prototype.constructor = LineCurve;

	// T is between 0 and 1
	LineCurve.prototype.getPoint = function(t) {
		const [x1, y1, z1] = this.startPoint;
		const [x2, y2, z2] = this.endPoint;
		const xDiff = x2 - x1;
		const yDiff = y2 - y1;
		const zDiff = z2 - z1;
		var tx = x1 + xDiff * t;
		var ty = y1 + yDiff * t;
		var tz = z1 + zDiff * t;
		return new THREE.Vector3(tx, ty, tz);
	};

	var path = new LineCurve(10000);
	var geometry = new THREE.TubeGeometry(path, 1, 10, 8, false);
	var material = new THREE.MeshBasicMaterial({
		color,
		transparent: true,
		opacity
	});
	var mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);
}

function renderShoreline() {
	fetch("./shoreline.json")
		.then(res => res.json())
		.then(lines => {
			fetch("./shorelineFaces.json")
				.then(res => res.json())
				.then(faces => {
					lines.forEach(line => {
						const lineVectors = [];
						line.forEach(([x, y, z]) => {
							lineVectors.push(new THREE.Vector3(x, y, z));
						});
						renderLine(lineVectors);
					});
				});
		});

	function renderLine(vertices) {
		var geometry = new THREE.BufferGeometry().setFromPoints(vertices);
		var material = new THREE.LineBasicMaterial({ color: 0x555555 });
		var curveObject = new THREE.Line(geometry, material);
		scene.add(curveObject);
	}
}

function renderShoreline2() {
	fetch("./shoreline.json")
		.then(res => res.json())
		.then(lines => {
			fetch("./shorelineFaces.json")
				.then(res => res.json())
				.then(faces => {
					lines.forEach((line, i) => renderLine(line, faces[i], i));
				});
		});

	function renderLine(vertices, faces, index) {
		const color = Math.random() * 0xffffff;
		console.log(color.toString(16), index);
		// if (index < 71) return
		// const color = 0xe8e8e8;
		if (!faces.length) {
			const lineVectors = [];
			vertices.forEach(([x, y, z]) => {
				lineVectors.push(new THREE.Vector3(x, y, z));
			});
			var geometry = new THREE.BufferGeometry().setFromPoints(
				lineVectors
			);
			var material = new THREE.LineBasicMaterial({ color });
			var curveObject = new THREE.Line(geometry, material);
			scene.add(curveObject);
			return;
		}

		var geometry = new THREE.Geometry();
		vertices.forEach(([x, y, z]) => {
			geometry.vertices.push(new THREE.Vector3(x, y, z));
		});

		for (var i = 0; i < faces.length - 2; i += 3) {
			const a = faces[i];
			const b = faces[i + 1];
			const c = faces[i + 2];
			geometry.faces.push(new THREE.Face3(a, b, c));
		}

		var material = new THREE.MeshBasicMaterial({
			color,
			side: THREE.DoubleSide
			// flatShading: THREE.FlatShading
		});
		var mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);
	}
}

function renderCamera() {
	const cameraRadius = 60000;
	const fov = 45;
	const aspect = window.innerWidth / window.innerHeight;
	const near = 2;
	const far = 10000000;
	const phi = 60; // ??
	var camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
	camera.position.x = cameraRadius * -2;
	camera.position.y = cameraRadius * Math.sin((phi * Math.PI) / 360);
	camera.position.z = cameraRadius * -0.25;
	var controls = new THREE.OrbitControls(camera);
	controls.minPolarAngle = 0;
	// TODO: https://github.com/mrdoob/three.js/issues/7384#issuecomment-149972582
	return [camera, controls];
}

function renderLights() {
	const color = 0xffffff;

	var directionalLight = new THREE.DirectionalLight(color, 0.75);
	directionalLight.position.x = 10000;
	directionalLight.position.y = 10000;
	directionalLight.position.z = 10000;

	var directionalLight2 = new THREE.DirectionalLight(color, 0.75);
	directionalLight2.position.x = -10000;
	directionalLight2.position.y = 10000;
	directionalLight2.position.z = 0;

	var directionalLight3 = new THREE.DirectionalLight(color, 0.75);
	directionalLight3.position.x = 10000;
	directionalLight3.position.y = 10000;
	directionalLight3.position.z = -10000;

	scene.add(directionalLight);
	scene.add(directionalLight2);
	scene.add(directionalLight3);
}

function renderStats() {
	var stats = new Stats();
	stats.showPanel(0); // 0: fps
	document.body.appendChild(stats.dom);
	return stats;
}

function animate() {
	requestAnimationFrame(animate);
	stats.begin();
	if (resizeRendererToDisplaySize(renderer)) {
		const canvas = renderer.domElement;
		camera.aspect = canvas.clientWidth / canvas.clientHeight;
		camera.updateProjectionMatrix();
	}
	controls.update();
	renderer.render(scene, camera);
	stats.end();
}

function resizeRendererToDisplaySize(renderer) {
	const canvas = renderer.domElement;
	const pixelRatio = window.devicePixelRatio;
	const width = canvas.clientWidth * pixelRatio;
	const height = canvas.clientHeight * pixelRatio;
	const needResize = canvas.width !== width || canvas.height !== height;
	if (needResize) {
		renderer.setSize(width, height, false);
	}
	return needResize;
}
