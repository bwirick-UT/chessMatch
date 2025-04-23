import { initShaderProgram } from "./shader.js";
import { ChessSet } from "./chessSet.js";
import { handleCanvasClick, updateCamera, initStatusMessage, chessRules } from "./userInteraction.js";
import { Camera } from "./camera.js";
import { updateHighlightPositions } from "./moveHighlighter.js";
import { HauntedPiece } from "./hauntedPiece.js";
import { FloatingPieces } from "./floatingPieces.js";
import { ChessMultiplayer } from './multiplayer.js';

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

	// Initialize the floating pieces effect
	const floatingPieces = new FloatingPieces(gl, c);

	// Make effects available globally
	window.hauntedPiece = hauntedPiece;
	window.floatingPieces = floatingPieces;

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

	// Add multiplayer UI elements
	const multiplayerUI = document.createElement('div');
	multiplayerUI.innerHTML = `
		<div id="multiplayer-controls" style="position: absolute; top: 10px; right: 10px; background-color: rgba(0, 0, 0, 0.7); padding: 10px; border-radius: 5px; z-index: 1000;">
			<button id="create-game" style="margin-right: 5px; padding: 5px 10px;">Create Game</button>
			<input id="game-id" placeholder="Game ID" style="margin-right: 5px; padding: 5px;">
			<button id="join-game" style="padding: 5px 10px;">Join Game</button>
		</div>
	`;
	document.body.appendChild(multiplayerUI);

	// Initialize multiplayer with game manager object
	const gameManager = {
		chessSet: c,
		camera: camera,
		chessRules: chessRules,
		makeMove: function(move) {
			// This function will be called when a move is received from the server
			const { fromRow, fromCol, toRow, toCol } = move;

			// Make sure the move is valid
			if (chessRules.isValidMove(c.board, fromRow, fromCol, toRow, toCol)) {
				// Make the move but don't update the current player (the server will tell us the new player)
				chessRules.makeMove(c.board, fromRow, fromCol, toRow, toCol, false);

				// Update the status message
				updateStatusMessage(true);

				// Rotate camera to show the board from the current player's perspective
				camera.rotateForPlayerChange(previousTime);

				// Update the haunted piece when player changes
				if (window.hauntedPiece) {
					window.hauntedPiece.onPlayerChanged();
				}
			}
		},
		startGame: function() {
			// This function will be called when a second player joins
			console.log('Multiplayer game started');

			// Make sure the current player is set to white
			chessRules.currentPlayer = 'w';

			// Reset the board to initial state
			c.resetBoard();

			// Update the status message
			updateStatusMessage(true);
		}
	};

	// Create the multiplayer instance
	const multiplayer = new ChessMultiplayer(gameManager);

	// We need to be careful with the click handlers
	// Since we can't directly access existing handlers, we'll create a new one
	// that works with the multiplayer system

	// Remove any existing click handlers to avoid conflicts
	const existingHandlers = [];
	if (canvas.onclick) {
		existingHandlers.push(canvas.onclick);
		canvas.onclick = null;
	}

	// Add new click handler that checks for multiplayer
	const multiplayerClickHandler = (event) => {
		// Only handle clicks if not dragging
		if (!isDragging) {
			console.log('Click detected, playerColor:', multiplayer.playerColor);

			// Check if it's a multiplayer game
			if (multiplayer.gameId) {
				// Check if game is active
				if (!multiplayer.active) {
					console.log('Game not active yet - waiting for second player');
					return; // Game not started
				}

				// Check if it's this player's turn
				const isPlayerTurn =
					(multiplayer.playerColor === 'w' && chessRules.currentPlayer === 'w') ||
					(multiplayer.playerColor === 'b' && chessRules.currentPlayer === 'b');

				if (!isPlayerTurn) {
					console.log(`Not your turn. You are ${multiplayer.playerColor === 'w' ? 'WHITE' : 'BLACK'}, current player is ${chessRules.currentPlayer === 'w' ? 'WHITE' : 'BLACK'}`);
					return; // Not this player's turn
				}

				console.log(`You are ${multiplayer.playerColor === 'w' ? 'WHITE' : 'BLACK'} - processing your move`);

				// Handle the click with a custom callback for multiplayer moves
				handleCanvasClick(event, canvas, c, camera, previousTime,
					(fromRow, fromCol, toRow, toCol) => {
						console.log('Move callback triggered:', fromRow, fromCol, toRow, toCol);
						// Send the move to the server
						multiplayer.sendMove(fromRow, fromCol, toRow, toCol);
					},
					multiplayer.playerColor // Pass the player's color to ensure correct pieces can be selected
				);
			} else {
				// Regular local game
				handleCanvasClick(event, canvas, c, camera, previousTime);
			}
		}
	};

	// Add the new handler
	canvas.addEventListener("click", multiplayerClickHandler);

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

