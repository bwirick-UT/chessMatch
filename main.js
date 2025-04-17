import { initShaderProgram } from "./shader.js";
import { ChessSet } from "./chessSet.js";
import { Sandra } from "./sandra.js";
import { Granite } from "./granite.js";
import { handleCanvasClick, updateCamera, initStatusMessage, chessRules } from "./userInteraction.js";
import { Camera } from "./camera.js";
import { updateHighlightPositions } from "./moveHighlighter.js";
import { HauntedPiece } from "./hauntedPiece.js";

main();
async function main() {
	console.log('This is working');

	//
	// start gl
	//
	const canvas = document.getElementById('glcanvas');
	const gl = canvas.getContext('webgl');
	if (!gl) {
		alert('Your browser does not support WebGL');
	}
	gl.clearColor(0.75, 0.85, 0.8, 1.0);
	gl.enable(gl.DEPTH_TEST); // Enable depth testing
	gl.depthFunc(gl.LEQUAL); // Near things obscure far things
	gl.enable(gl.CULL_FACE);

	//
	// Setup keyboard events:
	//

	window.addEventListener("keydown", keyDown);
	function keyDown(event) {
	}
	window.addEventListener("keyup", keyUp);
	function keyUp(event) {
	}

	//
	// Create shader
	//
	const shaderProgram = initShaderProgram(gl, await (await fetch("textureNormalTriangles.vs")).text(), await (await fetch("textureNormalTriangles.fs")).text());
	//	SetShaderAttributes(gl, shaderProgram);

	gl.activeTexture(gl.TEXTURE0);
	gl.uniform1i(gl.getUniformLocation(shaderProgram, "uTexture"), 0);
	// const blackTexture = loadTexture(gl, 'pieces/PiezasAjedrezDiffuseMarmolBlackBrighter.png', [80, 80, 80, 255]);
	// const whiteTexture = loadTexture(gl, 'pieces/PiezasAjedrezDiffuseMarmol.png', [220, 220, 220, 255]);
	// const boardTexture = loadTexture(gl, 'pieces/TableroDiffuse01.png', [255, 171, 0, 255]);


	//
	// load a modelview matrix and normatMatrixonto the shader
	//
	const modelViewMatrix = mat4.create();
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelViewMatrix"), false, modelViewMatrix);

	const normalMatrix = mat3.create();
	mat3.normalFromMat4(normalMatrix, modelViewMatrix);
	gl.uniformMatrix3fv(gl.getUniformLocation(shaderProgram, "uNormalMatrix"), false, normalMatrix);

	//
	// Other shader variables:
	//
	function setLightDirection(x, y, z) {
		gl.uniform3fv(
			gl.getUniformLocation(shaderProgram, "uLightDirection"),
			[x, y, z]
		);
	}

	function setCameraLightDirection(x, y, z) {
		gl.uniform3fv(
			gl.getUniformLocation(shaderProgram, "uCameraLightDirection"),
			[x, y, z]
		);
	}

	// Set the main directional light (from above and slightly to the side)
	setLightDirection(0, -1, 0);

	// Initial camera light (will be updated based on camera position)
	setCameraLightDirection(0, -0.5, -1);

	// Initialize camera
	const camera = new Camera();
	const { eye, at, up } = camera.getPosition();
	setObservationView(gl, shaderProgram, eye, at, up, canvas.clientWidth / canvas.clientHeight);

	// Set the board center for orbit mode
	camera.boardCenter = [0, 0, 0];


	//
	// Create content to display
	//

	const c = new ChessSet(gl);
	await c.init(gl);
	const s = new Sandra(gl);
	const g = new Granite(gl);

	// Set the board reference in chess rules
	chessRules.board = c.board;

	// Make chess objects available globally for the reset functionality
	window.chessObjects = {
		chessSet: c,
		camera: camera
	};

	// Debug chess set and rules before initializing haunted piece
	console.log("Chess set initialized:", c);
	console.log("Chess rules initialized:", chessRules);
	console.log("Chess board state:", c.board);
	console.log("Current player:", chessRules.currentPlayer);
	console.log("Available buffers:", Object.keys(c.buffers));

	// Initialize the haunted piece effect
	const hauntedPiece = new HauntedPiece(gl, c, chessRules);

	// Make haunted piece available globally
	window.hauntedPiece = hauntedPiece;

	// Initialize the status message
	initStatusMessage();

	// Variables for camera control
	let isDragging = false;
	let lastMouseX = 0;
	let lastMouseY = 0;

	// Add mouse click event listener for chess piece selection
	canvas.addEventListener("click", (event) => {
		// Only handle clicks if not dragging (to prevent selecting pieces during camera movement)
		if (!isDragging) {
			// Handle the click event with the current time for camera animation
			handleCanvasClick(event, canvas, c, camera, previousTime);
		}
	});

	// Add mouse event listeners for camera control
	canvas.addEventListener('mousedown', (e) => {
		// Right click for orbit
		if (e.button === 2) {
			if (!camera.isAnimating) { // Only allow camera control when not animating
				isDragging = true;
				lastMouseX = e.clientX;
				lastMouseY = e.clientY;
				canvas.style.cursor = 'grabbing';
				e.preventDefault();
			}
		}
	});

	canvas.addEventListener('mousemove', (e) => {
		if (isDragging) {
			// Calculate delta with some smoothing
			const deltaX = e.clientX - lastMouseX;
			const deltaY = e.clientY - lastMouseY;

			// Only apply movement if it's not too large (prevents jumps)
			if (Math.abs(deltaX) < 100 && Math.abs(deltaY) < 100) {
				// Orbit with right button
				camera.orbit(deltaX, deltaY);
			}

			lastMouseX = e.clientX;
			lastMouseY = e.clientY;
			canvas.style.cursor = 'grabbing';
		}

		// Update haunted piece position
		const rect = canvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		// Create projection matrix for the haunted piece
		const projectionMatrix = mat4.create();
		const fov = 60 * Math.PI / 180;
		const near = 1;
		const far = 100;
		mat4.perspective(projectionMatrix, fov, canvas.clientWidth / canvas.clientHeight, near, far);

		// Get current camera position
		const { eye, at, up } = camera.getPosition();

		// Update the haunted piece position
		hauntedPiece.updatePosition(mouseX, mouseY, canvas, eye, at, up, projectionMatrix);
	});

	canvas.addEventListener('mouseup', () => {
		isDragging = false;
		canvas.style.cursor = 'default';
	});

	canvas.addEventListener('mouseleave', () => {
		isDragging = false;
		canvas.style.cursor = 'default';
	});

	// Prevent context menu on right-click
	canvas.addEventListener('contextmenu', e => e.preventDefault());

	// Add wheel event for zoom
	canvas.addEventListener('wheel', (e) => {
		if (!camera.isAnimating) { // Only allow zoom when not animating
			e.preventDefault();
			const scrollAmount = Math.sign(e.deltaY) * 0.1;
			camera.zoom(scrollAmount);
		}
	}, { passive: false });

	window.addEventListener("resize", reportWindowSize);
	function reportWindowSize() {
		const clarity = 1.0; // use 4.0 for better looking textures
		gl.canvas.width = gl.canvas.clientWidth * clarity;
		gl.canvas.height = gl.canvas.clientHeight * clarity;
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	}
	reportWindowSize();

	//
	// Main render loop
	//
	let previousTime = 0;
	let frameCounter = 0;
	function redraw(currentTime) {
		currentTime *= .001; // milliseconds to seconds
		let DT = currentTime - previousTime;
		if (DT > .5)
			DT = .5;
		frameCounter += 1;
		if (Math.floor(currentTime) != Math.floor(previousTime)) {
			//console.log(frameCounter);
			frameCounter = 0;
		}
		previousTime = currentTime;

		//
		// Update camera
		//
		// Update camera animation if needed
		updateCamera(camera, currentTime);

		//
		// Draw
		//
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// Get current camera position
		const { eye, at, up } = camera.getPosition();
		setObservationView(gl, shaderProgram, eye, at, up, canvas.clientWidth / canvas.clientHeight)

		// Update highlight positions based on camera view
		const projectionMatrix = mat4.create();
		const fov = 60 * Math.PI / 180;
		const near = 1;
		const far = 100;
		mat4.perspective(projectionMatrix, fov, canvas.clientWidth / canvas.clientHeight, near, far);
		updateHighlightPositions(canvas, eye, at, up, projectionMatrix);

		c.draw(gl, shaderProgram, currentTime);

		// Draw the haunted piece
		hauntedPiece.draw(gl, shaderProgram, currentTime);

		//s.draw(gl, shaderProgram);

		//g.draw(gl, shaderProgram);

		requestAnimationFrame(redraw);
	}
	requestAnimationFrame(redraw);
};

function setObservationView(gl, shaderProgram, eye, at, up, canvasAspect) {
	const projectionMatrix = mat4.create();
	const fov = 60 * Math.PI / 180;
	const near = 1;
	const far = 100;
	mat4.perspective(projectionMatrix, fov, canvasAspect, near, far);

	const lookAtMatrix = mat4.create();
	mat4.lookAt(lookAtMatrix, eye, at, up);
	mat4.multiply(projectionMatrix, projectionMatrix, lookAtMatrix);

	const projectionMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
	gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);

	gl.uniform3fv(
		gl.getUniformLocation(shaderProgram, "uEyePosition"),
		eye
	);

	// Calculate camera light direction (from camera towards the board)
	const cameraLightDir = vec3.create();
	vec3.subtract(cameraLightDir, at, eye);
	vec3.normalize(cameraLightDir, cameraLightDir);

	// Add a slight downward component to the camera light
	cameraLightDir[1] -= 0.5;
	vec3.normalize(cameraLightDir, cameraLightDir);

	// Update the camera light direction
	gl.uniform3fv(
		gl.getUniformLocation(shaderProgram, "uCameraLightDirection"),
		cameraLightDir
	);
}

