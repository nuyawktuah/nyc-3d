// Scene
var scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xb2d8f9, 1, 10000000);

// Renderer
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(scene.fog.color, 1);
document.body.appendChild(renderer.domElement);

const [camera, controls] = renderCamera();
renderLights();
const stats = renderStats();
// renderShoreline();
renderShoreline2();
renderBuildings();

animate();

async function renderBuildings() {
	for (var i = 78; i >= 0; i--) {
		await renderBuffers(i);
	}

	async function renderBuffers(index) {
		const verticesBuffer = await fetchBuffer(`vertices${index}.buffer`);
		const vertices = new Float32Array(verticesBuffer);
		const facesBuffer = await fetchBuffer(`faces${index}.buffer`);
		const faces = new Uint32Array(facesBuffer);

		const buildingsGeom = new THREE.BufferGeometry();
		buildingsGeom.addAttribute(
			"position",
			new THREE.BufferAttribute(vertices, 3)
		);
		buildingsGeom.setIndex(new THREE.BufferAttribute(faces, 3));

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

		// Does this do anything?
		delete verticesBuffer;
		delete facesBuffer;
		delete vertices;
		delete faces;

		const buildingsMaterial = new THREE.MeshPhongMaterial({
			side: THREE.DoubleSide,
			flatShading: THREE.FlatShading
		});

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
		var material = new THREE.LineBasicMaterial({ color: 0x0000ff });
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
					lines.forEach((line, i) => renderLine(line, faces[i]));
				});
		});

	function renderLine(vertices, faces) {
		// const color = Math.random() * 0xffffff;
		const color = 0xe8e8e8;
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

	var directionalLight = new THREE.DirectionalLight(color, 0.5);
	directionalLight.position.x = 10000;
	directionalLight.position.y = 10000;
	directionalLight.position.z = 10000;

	var directionalLight2 = new THREE.DirectionalLight(color, 0.5);
	directionalLight2.position.x = -10000;
	directionalLight2.position.y = 10000;
	directionalLight2.position.z = 0;

	var directionalLight3 = new THREE.DirectionalLight(color, 0.5);
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
