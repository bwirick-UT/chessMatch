import { ChessRules, GAME_ONGOING, GAME_CHECKMATE, GAME_STALEMATE, GAME_DRAW } from "./chessRules.js";
import {
    showNotification,
    showCheckNotification,
    showCheckmateNotification,
    showStalemateNotification,
    showDrawNotification
} from "./notifications.js";
import { showValidMoves, clearHighlights } from "./moveHighlighter.js";
import { createNewGameButton, hideNewGameButton, resetGame } from "./gameReset.js";

let isProcessingMove = false;

const chessRules = new ChessRules();

let selectedPiece = null;
let selectedPosition = null;

window.chessSelection = {
    get selectedPiece() { return selectedPiece; },
    set selectedPiece(value) { selectedPiece = value; },
    get selectedPosition() { return selectedPosition; },
    set selectedPosition(value) { selectedPosition = value; }
};

window.clearHighlights = () => clearHighlights();

let statusMessageElement = null;

function initStatusMessage() {
    statusMessageElement = document.getElementById('chess-status');

    if (!statusMessageElement) {
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

        document.body.appendChild(statusMessageElement);
    }

    updateStatusMessage();
}

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
            if (chessRules.board) {
                const inCheck = chessRules.isInCheck(chessRules.board, chessRules.currentPlayer);
                if (inCheck) {
                    message += ' (Check!)';
                    if (showNotifications) {
                        showCheckNotification(chessRules.currentPlayer);
                    }
                }
            }
            hideNewGameButton();
            break;
    }

    statusMessageElement.textContent = message;

    if (gameOver) {
        createNewGameButton(() => {
            let chessSet = null;
            let camera = null;

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

function screenToBoard(x, y, canvas, eye, at, up, projectionMatrix) {
    const ndcX = (2.0 * x) / canvas.width - 1.0;
    const ndcY = 1.0 - (2.0 * y) / canvas.height;

    const clipCoords = vec4.fromValues(ndcX, ndcY, -1.0, 1.0);

    const invProjectionMatrix = mat4.create();
    mat4.invert(invProjectionMatrix, projectionMatrix);
    const eyeCoords = vec4.create();
    vec4.transformMat4(eyeCoords, clipCoords, invProjectionMatrix);
    eyeCoords[2] = -1.0;
    eyeCoords[3] = 0.0;

    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, eye, at, up);
    const invViewMatrix = mat4.create();
    mat4.invert(invViewMatrix, viewMatrix);
    const worldCoords = vec4.create();
    vec4.transformMat4(worldCoords, eyeCoords, invViewMatrix);
    const rayDirection = vec3.fromValues(worldCoords[0], worldCoords[1], worldCoords[2]);
    vec3.normalize(rayDirection, rayDirection);

    const rayOrigin = eye;
    const planeNormal = vec3.fromValues(0, 1, 0);
    const planePoint = vec3.fromValues(0, 0, 0);

    const denominator = vec3.dot(planeNormal, rayDirection);
    if (Math.abs(denominator) > 0.0001) {
        const t = vec3.dot(vec3.sub(vec3.create(), planePoint, rayOrigin), planeNormal) / denominator;
        if (t >= 0) {
            const intersection = vec3.create();
            vec3.scaleAndAdd(intersection, rayOrigin, rayDirection, t);

            const boardX = Math.floor(intersection[0] + 4);
            const boardZ = Math.floor(intersection[2] + 4);

            if (boardX >= 0 && boardX < 8 && boardZ >= 0 && boardZ < 8) {
                return { row: 7 - boardZ, col: boardX };
            }
        }
    }

    return null;
}

function handleCanvasClick(event, canvas, chessSet, camera, currentTime) {
    chessRules.board = chessSet.board;
    if (isProcessingMove || camera.isAnimating) {
        return;
    }

    const gameState = chessRules.getGameState();
    if (gameState.state !== GAME_ONGOING) {
        console.log(`Game is over: ${gameState.state}`);
        return;
    }

    const { eye, at, up } = camera.getPosition();

    const projectionMatrix = mat4.create();
    const fov = 60 * Math.PI / 180;
    const near = 1;
    const far = 100;
    mat4.perspective(projectionMatrix, fov, canvas.clientWidth / canvas.clientHeight, near, far);

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const boardPos = screenToBoard(x, y, canvas, eye, at, up, projectionMatrix);

    if (boardPos) {
        const { row, col } = boardPos;

        if (!selectedPiece) {
            const piece = chessSet.board[row][col];

            if (piece && piece[0] === chessRules.currentPlayer) {
                selectedPiece = piece;
                selectedPosition = { row, col };
                console.log(`Selected piece: ${piece} at position [${row}, ${col}]`);

                showValidMoves(chessRules, chessSet.board, row, col, canvas, eye, at, up, projectionMatrix,
                    (fromRow, fromCol, toRow, toCol) => {
                        if (chessRules.isValidMove(chessSet.board, fromRow, fromCol, toRow, toCol)) {
                            console.log(`Moving ${chessSet.board[fromRow][fromCol]} from [${fromRow}, ${fromCol}] to [${toRow}, ${toCol}]`);

                            const targetPiece = chessSet.board[toRow][toCol];
                            const isCapture = targetPiece !== null;

                            const movingPiece = chessSet.board[fromRow][fromCol];
                            const isPawn = movingPiece && movingPiece[1] === 'p';
                            const isEnPassant = isPawn && fromCol !== toCol && !targetPiece;

                            let enPassantPiece = null;
                            if (isEnPassant) {
                                enPassantPiece = chessSet.board[fromRow][toCol];
                            }

                            
                            const attackDuration = chessSet.animateAttack(fromRow, fromCol, toRow, toCol, currentTime);

                            
                            let deathDuration = 0;
                            if (isCapture) {
                                chessSet.addCapturedPiece(targetPiece, toRow, toCol, currentTime + attackDuration * 0.5);
                                deathDuration = 1.2;
                            } else if (isEnPassant && enPassantPiece) {
                                chessSet.addCapturedPiece(enPassantPiece, fromRow, toCol, currentTime + attackDuration * 0.5);
                                deathDuration = 1.2;
                            }
                            
                            const moveStartTime = currentTime + attackDuration * 0.7;
                            const moveDuration = chessSet.animateMove(fromRow, fromCol, toRow, toCol, moveStartTime);

                            const totalAnimationTime = attackDuration * 0.7 + moveDuration + Math.max(0, deathDuration - moveDuration);

                            chessRules.makeMove(chessSet.board, fromRow, fromCol, toRow, toCol);

                            selectedPiece = null;
                            selectedPosition = null;
                            clearHighlights();

                            updateStatusMessage(true);

                            setTimeout(() => {
                                const newGameState = chessRules.getGameState();
                                if (newGameState.state === GAME_ONGOING) {
                                    isProcessingMove = true;

                                    camera.rotateForPlayerChange(currentTime + totalAnimationTime);

                                    if (window.hauntedPiece) {
                                        window.hauntedPiece.onPlayerChanged();
                                    }
                                }
                            }, totalAnimationTime * 1000);

                            isProcessingMove = true;
                        }
                    }
                );
            } else if (piece) {
                console.log(`Cannot select opponent's piece. Current player: ${chessRules.currentPlayer === 'w' ? 'White' : 'Black'}`);
            } else {
                console.log(`Clicked empty square at [${row}, ${col}]`);
            }
        }
        else {
            const fromRow = selectedPosition.row;
            const fromCol = selectedPosition.col;

            const targetPiece = chessSet.board[row][col];

            if (selectedPosition && row === selectedPosition.row && col === selectedPosition.col) {
                selectedPiece = null;
                selectedPosition = null;
                clearHighlights();
                console.log('Piece deselected');
                return;
            }

            if (targetPiece && targetPiece[0] === chessRules.currentPlayer) {
                clearHighlights();

                selectedPiece = targetPiece;
                selectedPosition = { row, col };
                console.log(`Changed selection to: ${targetPiece} at position [${row}, ${col}]`);

                showValidMoves(chessRules, chessSet.board, row, col, canvas, eye, at, up, projectionMatrix,
                    (fromRow, fromCol, toRow, toCol) => {
                        if (chessRules.isValidMove(chessSet.board, fromRow, fromCol, toRow, toCol)) {
                            console.log(`Moving ${chessSet.board[fromRow][fromCol]} from [${fromRow}, ${fromCol}] to [${toRow}, ${toCol}]`);

                            const targetPiece = chessSet.board[toRow][toCol];
                            const isCapture = targetPiece !== null;

                            const movingPiece = chessSet.board[fromRow][fromCol];
                            const isPawn = movingPiece && movingPiece[1] === 'p';
                            const isEnPassant = isPawn && fromCol !== toCol && !targetPiece;

                            let enPassantPiece = null;
                            if (isEnPassant) {
                                enPassantPiece = chessSet.board[fromRow][toCol];
                            }

                            
                            const attackDuration = chessSet.animateAttack(fromRow, fromCol, toRow, toCol, currentTime);

                            
                            let deathDuration = 0;
                            if (isCapture) {
                                chessSet.addCapturedPiece(targetPiece, toRow, toCol, currentTime + attackDuration * 0.7);
                                deathDuration = 0.5;
                            } else if (isEnPassant && enPassantPiece) {
                                chessSet.addCapturedPiece(enPassantPiece, fromRow, toCol, currentTime + attackDuration * 0.7);
                                deathDuration = 0.5;
                            }

                            const totalAnimationTime = Math.max(attackDuration, attackDuration * 0.7 + deathDuration);

                            setTimeout(() => {
                                chessRules.makeMove(chessSet.board, fromRow, fromCol, toRow, toCol);

                                selectedPiece = null;
                                selectedPosition = null;
                                clearHighlights();

                                updateStatusMessage(true);

                                const newGameState = chessRules.getGameState();
                                if (newGameState.state === GAME_ONGOING) {
                                    isProcessingMove = true;

                                    setTimeout(() => {
                                        camera.rotateForPlayerChange(currentTime + totalAnimationTime);

                                        if (window.hauntedPiece) {
                                            window.hauntedPiece.onPlayerChanged();
                                        }
                                    }, deathDuration * 1000);
                                }
                            }, attackDuration * 1000 * 0.7);

                            isProcessingMove = true;
                        }
                    }
                );
            }
            else if (chessRules.isValidMove(chessSet.board, fromRow, fromCol, row, col)) {
                console.log(`Moving ${selectedPiece} from [${fromRow}, ${fromCol}] to [${row}, ${col}]`);

                const targetPiece = chessSet.board[row][col];
                const isCapture = targetPiece !== null;

                const movingPiece = chessSet.board[fromRow][fromCol];
                const isPawn = movingPiece && movingPiece[1] === 'p';
                const isEnPassant = isPawn && fromCol !== col && !targetPiece;

                let enPassantPiece = null;
                if (isEnPassant) {
                    enPassantPiece = chessSet.board[fromRow][col];
                }

                
                const attackDuration = chessSet.animateAttack(fromRow, fromCol, row, col, currentTime);

                
                let deathDuration = 0;
                if (isCapture) {
                    chessSet.addCapturedPiece(targetPiece, row, col, currentTime + attackDuration * 0.5);
                    deathDuration = 1.2;
                } else if (isEnPassant && enPassantPiece) {
                    chessSet.addCapturedPiece(enPassantPiece, fromRow, col, currentTime + attackDuration * 0.5);
                    deathDuration = 1.2;
                }

                
                const moveStartTime = currentTime + attackDuration * 0.7;
                const moveDuration = chessSet.animateMove(fromRow, fromCol, row, col, moveStartTime);

                const totalAnimationTime = attackDuration * 0.7 + moveDuration + Math.max(0, deathDuration - moveDuration);

                chessRules.makeMove(chessSet.board, fromRow, fromCol, row, col);

                selectedPiece = null;
                selectedPosition = null;
                clearHighlights();

                updateStatusMessage(true);

                setTimeout(() => {
                    const newGameState = chessRules.getGameState();
                    if (newGameState.state === GAME_ONGOING) {
                        isProcessingMove = true;

                        camera.rotateForPlayerChange(currentTime + totalAnimationTime);

                        if (window.hauntedPiece) {
                            window.hauntedPiece.onPlayerChanged();
                        }
                    }
                }, totalAnimationTime * 1000);

                isProcessingMove = true;
            } else {
                console.log(`Invalid move from [${fromRow}, ${fromCol}] to [${row}, ${col}]`);
                
                showNotification('Invalid move!', 'error', 1500);
                
                selectedPiece = null;
                selectedPosition = null;
                clearHighlights();
            }
        }
    }
}


function updateCamera(camera, currentTime) {
    let updated = false;

    
    if (camera.update(currentTime)) {
        updated = true;
    }

    
    if (!camera.isAnimating && !window.chessObjects.chessSet.hasRunningAnimations(currentTime) && isProcessingMove) {
        
        isProcessingMove = false;
    }

    return updated;
}

export { handleCanvasClick, updateCamera, initStatusMessage, chessRules };
