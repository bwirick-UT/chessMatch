import { initShaderProgram } from "./shader.js";
import { ChessSet } from "./chessSet.js";
import { handleCanvasClick, updateCamera, initStatusMessage, chessRules } from "./userInteraction.js";
import { Camera } from "./camera.js";
import { updateHighlightPositions } from "./moveHighlighter.js";
import { HauntedPiece } from "./hauntedPiece.js";
import { initControlsPanel } from "./controlsPanel.js";
import { initKeyboardControls } from "./keyboardControls.js";

main();
async function main() {
	console.log('This is working');

	const canvas = document.getElementById('glcanvas');
	const gl = canvas.getContext('webgl');
	if (!gl) {
		alert('Your browser does not support WebGL');
	}
	gl.clearColor(0.75, 0.85, 0.8, 1.0);
	gl.enable(gl.DEPTH_TEST); 
	gl.depthFunc(gl.LEQUAL); 
	gl.enable(gl.CULL_FACE);

	window.addEventListener("keydown", keyDown);
	function keyDown() {
		
	}
	window.addEventListener("keyup", keyUp);
	function keyUp() {
		
	}

	const shaderProgram = initShaderProgram(gl, await (await fetch("textureNormalTriangles.vs")).text(), await (await fetch("textureNormalTriangles.fs")).text());
	
	gl.activeTexture(gl.TEXTURE0);
	gl.uniform1i(gl.getUniformLocation(shaderProgram, "uTexture"), 0);
	
	const modelViewMatrix = mat4.create();
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelViewMatrix"), false, modelViewMatrix);

	const normalMatrix = mat3.create();
	mat3.normalFromMat4(normalMatrix, modelViewMatrix);
	gl.uniformMatrix3fv(gl.getUniformLocation(shaderProgram, "uNormalMatrix"), false, normalMatrix);

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

	setLightDirection(0, -1, 0);

	setCameraLightDirection(0, -0.5, -1);

	const camera = new Camera();
	const { eye, at, up } = camera.getPosition();
	setObservationView(gl, shaderProgram, eye, at, up, canvas.clientWidth / canvas.clientHeight);

	camera.boardCenter = [0, 0, 0];

	const c = new ChessSet(gl);
	await c.init(gl);

	chessRules.board = c.board;

	window.chessObjects = {
		chessSet: c,
		camera: camera
	};

	console.log("Chess set initialized:", c);
	console.log("Chess rules initialized:", chessRules);
	console.log("Chess board state:", c.board);
	console.log("Current player:", chessRules.currentPlayer);
	console.log("Available buffers:", Object.keys(c.buffers));

	const hauntedPiece = new HauntedPiece(gl, c, chessRules);

	window.hauntedPiece = hauntedPiece;

	initStatusMessage();

	initControlsPanel();

	initKeyboardControls(chessRules);

	let isDragging = false;
	let lastMouseX = 0;
	let lastMouseY = 0;

	canvas.addEventListener("click", (event) => {
		
		if (!isDragging) {
			
			handleCanvasClick(event, canvas, c, camera, previousTime);
		}
	});

	canvas.addEventListener('mousedown', (e) => {
		
		if (e.button === 2) {
			if (!camera.isAnimating) { 
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
			
			const deltaX = e.clientX - lastMouseX;
			const deltaY = e.clientY - lastMouseY;

			
			if (Math.abs(deltaX) < 100 && Math.abs(deltaY) < 100) {
				
				camera.orbit(deltaX, deltaY);
			}

			lastMouseX = e.clientX;
			lastMouseY = e.clientY;
			canvas.style.cursor = 'grabbing';
		}

		const rect = canvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		const projectionMatrix = mat4.create();
		const fov = 60 * Math.PI / 180;
		const near = 1;
		const far = 100;
		mat4.perspective(projectionMatrix, fov, canvas.clientWidth / canvas.clientHeight, near, far);

		const { eye, at, up } = camera.getPosition();

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

	canvas.addEventListener('contextmenu', e => e.preventDefault());

	canvas.addEventListener('wheel', (e) => {
		if (!camera.isAnimating) { 
			e.preventDefault();
			const scrollAmount = Math.sign(e.deltaY) * 0.1;
			camera.zoom(scrollAmount);
		}
	}, { passive: false });

	window.addEventListener("resize", reportWindowSize);
	function reportWindowSize() {
		const clarity = 1.0; 
		gl.canvas.width = gl.canvas.clientWidth * clarity;
		gl.canvas.height = gl.canvas.clientHeight * clarity;
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	}
	reportWindowSize();

	let previousTime = 0;
	let frameCounter = 0;
	function redraw(currentTime) {
		currentTime *= .001; 
		let DT = currentTime - previousTime;
		if (DT > .5)
			DT = .5;
		frameCounter += 1;
		if (Math.floor(currentTime) != Math.floor(previousTime)) {
			
			frameCounter = 0;
		}
		previousTime = currentTime;

		updateCamera(camera, currentTime);

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		const { eye, at, up } = camera.getPosition();
		setObservationView(gl, shaderProgram, eye, at, up, canvas.clientWidth / canvas.clientHeight)
		
		const projectionMatrix = mat4.create();
		const fov = 60 * Math.PI / 180;
		const near = 1;
		const far = 100;
		mat4.perspective(projectionMatrix, fov, canvas.clientWidth / canvas.clientHeight, near, far);
		updateHighlightPositions(canvas, eye, at, up, projectionMatrix);

		c.draw(gl, shaderProgram, currentTime);

		
		hauntedPiece.draw(gl, shaderProgram, currentTime);

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

	const cameraLightDir = vec3.create();
	vec3.subtract(cameraLightDir, at, eye);
	vec3.normalize(cameraLightDir, cameraLightDir);

	cameraLightDir[1] -= 0.5;
	vec3.normalize(cameraLightDir, cameraLightDir);

	gl.uniform3fv(
		gl.getUniformLocation(shaderProgram, "uCameraLightDirection"),
		cameraLightDir
	);
}

