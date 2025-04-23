// User interaction handling for chess game
import { ChessRules, GAME_ONGOING, GAME_CHECKMATE, GAME_STALEMATE, GAME_DRAW } from "./chessRules.js";
import {
    showNotification,
    showCheckNotification,
    showCheckmateNotification,
    showStalemateNotification,
    showDrawNotification
} from "./notifications.js";
import { showValidMoves, clearHighlights, updateHighlightPositions } from "./moveHighlighter.js";
import { createNewGameButton, hideNewGameButton, resetGame } from "./gameReset.js";

// Game state
let isProcessingMove = false; // Flag to prevent input during camera animation

// Initialize chess rules
const chessRules = new ChessRules();

// Track the selected piece and its position
let selectedPiece = null;
let selectedPosition = null;

// Game status message element
let statusMessageElement = null;

// Initialize the status message element
function initStatusMessage() {
    // Check if the element already exists
    statusMessageElement = document.getElementById('chess-status');

    if (!statusMessageElement) {
        // Create a new status message element
        statusMessageElement = document.createElement('div');
        statusMessageElement.id = 'chess-status';
        statusMessageElement.style.position = 'absolute';
        statusMessageElement.style.top = '10px';
        statusMessageElement.style.left = '10px';
        statusMessageElement.style.color = 'white';
        statusMessageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        statusMessageElement.style.padding = '10px';
        statusMessageElement.style.borderRadius = '5px';
        statusMessageElement.style.fontFamily = 'Arial, sans-serif';
        statusMessageElement.style.zIndex = '1000';

        // Add it to the document body
        document.body.appendChild(statusMessageElement);
    }

    // Set initial status message
    updateStatusMessage();
}

// Update the status message based on game state
function updateStatusMessage(showNotifications = false) {
    if (!statusMessageElement) return;

    const gameState = chessRules.getGameState();
    let message = '';
    let gameOver = false;

    switch (gameState.state) {
        case GAME_CHECKMATE:
            message = `Checkmate! ${gameState.winner === 'w' ? 'White' : 'Black'} wins!`;
            if (showNotifications) {
                showCheckmateNotification(gameState.winner);
            }
            gameOver = true;
            break;
        case GAME_STALEMATE:
            message = 'Stalemate! The game is a draw.';
            if (showNotifications) {
                showStalemateNotification();
            }
            gameOver = true;
            break;
        case GAME_DRAW:
            message = 'Draw! The game is a draw.';
            if (showNotifications) {
                showDrawNotification();
            }
            gameOver = true;
            break;
        case GAME_ONGOING:
            message = `${chessRules.currentPlayer === 'w' ? 'White' : 'Black'}'s turn`;
            // Only check for check if we have a board reference
            if (chessRules.board) {
                const inCheck = chessRules.isInCheck(chessRules.board, chessRules.currentPlayer);
                if (inCheck) {
                    message += ' (Check!)';
                    if (showNotifications) {
                        showCheckNotification(chessRules.currentPlayer);
                    }
                }
            }
            // Hide the new game button during ongoing game
            hideNewGameButton();
            break;
    }

    statusMessageElement.textContent = message;

    // Show the new game button if the game is over
    if (gameOver) {
        createNewGameButton(() => {
            // This function will be called when the new game button is clicked
            let chessSet = null;
            let camera = null;

            // Find the chessSet and camera objects from the main.js scope
            // We'll need to pass these from main.js when we call updateStatusMessage
            if (window.chessObjects) {
                chessSet = window.chessObjects.chessSet;
                camera = window.chessObjects.camera;
            }

            if (chessSet && camera) {
                resetGame(chessSet, chessRules, camera, updateStatusMessage);
                clearHighlights();
            } else {
                console.error('Chess objects not found for reset');
            }
        });
    }
}

// Convert screen coordinates to board coordinates
function screenToBoard(x, y, canvas, eye, at, up, projectionMatrix) {
    // Normalize device coordinates
    const ndcX = (2.0 * x) / canvas.width - 1.0;
    const ndcY = 1.0 - (2.0 * y) / canvas.height;

    // Create ray in clip space
    const clipCoords = vec4.fromValues(ndcX, ndcY, -1.0, 1.0);

    // Convert to eye space
    const invProjectionMatrix = mat4.create();
    mat4.invert(invProjectionMatrix, projectionMatrix);
    const eyeCoords = vec4.create();
    vec4.transformMat4(eyeCoords, clipCoords, invProjectionMatrix);
    eyeCoords[2] = -1.0; // Forward direction
    eyeCoords[3] = 0.0;  // Direction vector

    // Convert to world space
    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, eye, at, up);
    const invViewMatrix = mat4.create();
    mat4.invert(invViewMatrix, viewMatrix);
    const worldCoords = vec4.create();
    vec4.transformMat4(worldCoords, eyeCoords, invViewMatrix);
    const rayDirection = vec3.fromValues(worldCoords[0], worldCoords[1], worldCoords[2]);
    vec3.normalize(rayDirection, rayDirection);

    // Ray-plane intersection (assuming board is on y=0 plane)
    const rayOrigin = eye;
    const planeNormal = vec3.fromValues(0, 1, 0);
    const planePoint = vec3.fromValues(0, 0, 0);

    const denominator = vec3.dot(planeNormal, rayDirection);
    if (Math.abs(denominator) > 0.0001) {
        const t = vec3.dot(vec3.sub(vec3.create(), planePoint, rayOrigin), planeNormal) / denominator;
        if (t >= 0) {
            // Calculate intersection point
            const intersection = vec3.create();
            vec3.scaleAndAdd(intersection, rayOrigin, rayDirection, t);

            // Convert to board coordinates (0-7, 0-7)
            const boardX = Math.floor(intersection[0] + 4);
            const boardZ = Math.floor(intersection[2] + 4);

            // Check if within board bounds
            if (boardX >= 0 && boardX < 8 && boardZ >= 0 && boardZ < 8) {
                // Flip the row coordinate to match standard chess notation
                // where [0,0] is the bottom-left corner from white's perspective
                return { row: 7 - boardZ, col: boardX };
            }
        }
    }

    return null;
}

// Handle mouse click on the canvas
function handleCanvasClick(event, canvas, chessSet, camera, currentTime, multiplayerMoveCallback = null, playerColor = null) {
    // Set the board reference in the chess rules
    chessRules.board = chessSet.board;
    // Ignore clicks during camera animation or move processing
    if (isProcessingMove || camera.isAnimating) {
        return;
    }

    // If the game is over, ignore clicks
    const gameState = chessRules.getGameState();
    if (gameState.state !== GAME_ONGOING) {
        console.log(`Game is over: ${gameState.state}`);
        return;
    }

    // Get current camera position for ray casting
    const { eye, at, up } = camera.getPosition();

    // Create projection matrix for ray casting
    const projectionMatrix = mat4.create();
    const fov = 60 * Math.PI / 180;
    const near = 1;
    const far = 100;
    mat4.perspective(projectionMatrix, fov, canvas.clientWidth / canvas.clientHeight, near, far);

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert screen coordinates to board coordinates
    const boardPos = screenToBoard(x, y, canvas, eye, at, up, projectionMatrix);

    if (boardPos) {
        const { row, col } = boardPos;

        // If no piece is selected, try to select one
        if (!selectedPiece) {
            const piece = chessSet.board[row][col];

            // In multiplayer mode, only allow selecting pieces of your color
            const allowedColor = playerColor || chessRules.currentPlayer;
            console.log('Checking piece selection. Piece:', piece, 'Allowed color:', allowedColor);
            console.log('Player color from parameter:', playerColor);
            console.log('Current player from rules:', chessRules.currentPlayer);

            // Check if the piece belongs to the current player (or your assigned color in multiplayer)
            if (piece && piece[0] === allowedColor) {
                console.log('Piece color matches allowed color, selecting piece');
                selectedPiece = piece;
                selectedPosition = { row, col };
                console.log(`Selected piece: ${piece} at position [${row}, ${col}]`);

                // Show valid moves for the selected piece with a callback for when a move is made
                showValidMoves(chessRules, chessSet.board, row, col, canvas, eye, at, up, projectionMatrix,
                    // This callback will be called when a move highlight is clicked
                    (fromRow, fromCol, toRow, toCol) => {
                        // Make the move
                        if (chessRules.isValidMove(chessSet.board, fromRow, fromCol, toRow, toCol)) {
                            console.log(`Moving ${chessSet.board[fromRow][fromCol]} from [${fromRow}, ${fromCol}] to [${toRow}, ${toCol}]`);

                            // If this is a multiplayer move, send it to the server
                            if (multiplayerMoveCallback) {
                                multiplayerMoveCallback(fromRow, fromCol, toRow, toCol);
                            } else {
                                // Make the move using chess rules (local game)
                                chessRules.makeMove(chessSet.board, fromRow, fromCol, toRow, toCol);

                                // Update the status message and show notifications
                                updateStatusMessage(true);

                                // If the game is still ongoing, rotate the camera for the next player
                                const newGameState = chessRules.getGameState();
                                if (newGameState.state === GAME_ONGOING) {
                                    // Switch player and rotate camera
                                    isProcessingMove = true;
                                    camera.rotateForPlayerChange(currentTime);

                                    // Update the haunted piece when player changes
                                    if (window.hauntedPiece) {
                                        window.hauntedPiece.onPlayerChanged();
                                    }
                                }
                            }

                            // Reset selection and clear highlights
                            selectedPiece = null;
                            selectedPosition = null;
                            clearHighlights();
                        }
                    }
                );
            } else if (piece) {
                console.log(`Cannot select opponent's piece. Current player: ${chessRules.currentPlayer === 'w' ? 'White' : 'Black'}`);
            } else {
                console.log(`Clicked empty square at [${row}, ${col}]`);
            }
        }
        // If a piece is already selected, this could be the destination or a new piece selection
        else {
            const fromRow = selectedPosition.row;
            const fromCol = selectedPosition.col;

            // Check if the clicked square contains a piece of the current player's color
            const targetPiece = chessSet.board[row][col];

            // Debug the target piece
            console.log('Target piece:', targetPiece, 'at position [' + row + ',' + col + ']');
            console.log('Selected piece:', selectedPiece, 'at position [' + (selectedPosition ? selectedPosition.row : 'none') + ',' + (selectedPosition ? selectedPosition.col : 'none') + ']');

            // Check if the user clicked on the already selected piece (to deselect it)
            if (selectedPosition && row === selectedPosition.row && col === selectedPosition.col) {
                // Only deselect if we're not in multiplayer mode or if it's our turn
                if (!multiplayerMoveCallback ||
                    (playerColor === chessRules.currentPlayer)) {
                    // Deselect the piece
                    selectedPiece = null;
                    selectedPosition = null;
                    clearHighlights();
                    console.log('Piece deselected');
                    return;
                } else {
                    console.log('Cannot deselect piece in multiplayer when not your turn');
                }
            }

            // In multiplayer mode, only allow selecting pieces of your color
            const allowedColor = playerColor || chessRules.currentPlayer;
            console.log('Checking piece selection (already have piece selected). Piece:', targetPiece, 'Allowed color:', allowedColor);
            console.log('Player color from parameter:', playerColor);
            console.log('Current player from rules:', chessRules.currentPlayer);

            // If clicking on another piece of the same color, select that piece instead
            if (targetPiece && targetPiece[0] === allowedColor) {
                console.log('Target piece color matches allowed color, selecting new piece');
                // Clear previous selection and highlights
                clearHighlights();

                // Select the new piece
                selectedPiece = targetPiece;
                selectedPosition = { row, col };
                console.log(`Changed selection to: ${targetPiece} at position [${row}, ${col}]`);

                // Show valid moves for the newly selected piece with a callback for when a move is made
                showValidMoves(chessRules, chessSet.board, row, col, canvas, eye, at, up, projectionMatrix,
                    // This callback will be called when a move highlight is clicked
                    (fromRow, fromCol, toRow, toCol) => {
                        // Make the move
                        if (chessRules.isValidMove(chessSet.board, fromRow, fromCol, toRow, toCol)) {
                            console.log(`Moving ${chessSet.board[fromRow][fromCol]} from [${fromRow}, ${fromCol}] to [${toRow}, ${toCol}]`);

                            // If this is a multiplayer move, send it to the server
                            if (multiplayerMoveCallback) {
                                multiplayerMoveCallback(fromRow, fromCol, toRow, toCol);
                            } else {
                                // Make the move using chess rules (local game)
                                chessRules.makeMove(chessSet.board, fromRow, fromCol, toRow, toCol);

                                // Update the status message and show notifications
                                updateStatusMessage(true);

                                // If the game is still ongoing, rotate the camera for the next player
                                const newGameState = chessRules.getGameState();
                                if (newGameState.state === GAME_ONGOING) {
                                    // Switch player and rotate camera
                                    isProcessingMove = true;
                                    camera.rotateForPlayerChange(currentTime);

                                    // Update the haunted piece when player changes
                                    if (window.hauntedPiece) {
                                        window.hauntedPiece.onPlayerChanged();
                                    }
                                }
                            }

                            // Reset selection and clear highlights
                            selectedPiece = null;
                            selectedPosition = null;
                            clearHighlights();
                        }
                    }
                );
            }
            // Otherwise, treat it as a move attempt
            else if (chessRules.isValidMove(chessSet.board, fromRow, fromCol, row, col)) {
                console.log('Valid move detected from [' + fromRow + ',' + fromCol + '] to [' + row + ',' + col + ']');
                console.log(`Moving ${selectedPiece} from [${fromRow}, ${fromCol}] to [${row}, ${col}]`);

                // If this is a multiplayer move, send it to the server
                if (multiplayerMoveCallback) {
                    multiplayerMoveCallback(fromRow, fromCol, row, col);
                } else {
                    // Make the move using chess rules (local game)
                    chessRules.makeMove(chessSet.board, fromRow, fromCol, row, col);

                    // Update the status message and show notifications
                    updateStatusMessage(true);

                    // If the game is still ongoing, rotate the camera for the next player
                    const newGameState = chessRules.getGameState();
                    if (newGameState.state === GAME_ONGOING) {
                        // Switch player and rotate camera
                        isProcessingMove = true;
                        camera.rotateForPlayerChange(currentTime);

                        // Update the haunted piece when player changes
                        if (window.hauntedPiece) {
                            window.hauntedPiece.onPlayerChanged();
                        }
                    }
                }

                // Reset selection and clear highlights
                selectedPiece = null;
                selectedPosition = null;
                clearHighlights();
            } else {
                console.log(`Invalid move from [${fromRow}, ${fromCol}] to [${row}, ${col}]`);
                // Show notification for invalid move
                showNotification('Invalid move!', 'error', 1500);
                // Reset selection and clear highlights on invalid move
                selectedPiece = null;
                selectedPosition = null;
                clearHighlights();
            }
        }
    }
}

// Check if camera animation is complete
function updateCamera(camera, currentTime) {
    if (camera.update(currentTime)) {
        // Camera animation updated
        if (!camera.isAnimating && isProcessingMove) {
            // Camera animation complete, allow new moves
            isProcessingMove = false;
        }
        return true;
    }
    return false;
}

// Make updateStatusMessage available globally for multiplayer
window.updateStatusMessage = updateStatusMessage;

export { handleCanvasClick, updateCamera, initStatusMessage, chessRules, updateStatusMessage };
