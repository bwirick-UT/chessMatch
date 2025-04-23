let highlightedSquares = [];

function createHighlight(row, col, isCapture = false) {
    const existingHighlight = document.getElementById(`highlight-${row}-${col}`);
    if (existingHighlight) {
        if (isCapture) {
            existingHighlight.dataset.isCapture = 'true';
            existingHighlight.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
            existingHighlight.style.border = '2px solid rgba(255, 0, 0, 0.6)';
        } else {
            existingHighlight.dataset.isCapture = 'false';
            existingHighlight.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
            existingHighlight.style.border = '2px solid rgba(0, 255, 0, 0.6)';
        }
        return existingHighlight;
    }

    const highlight = document.createElement('div');
    highlight.id = `highlight-${row}-${col}`;
    highlight.className = 'move-highlight';
    highlight.dataset.row = row;
    highlight.dataset.col = col;
    highlight.dataset.isCapture = isCapture ? 'true' : 'false';

    highlight.style.position = 'absolute';
    highlight.style.width = '60px';
    highlight.style.height = '60px';
    highlight.style.borderRadius = '5px';
    highlight.style.transition = 'background-color 0.2s, border 0.2s, transform 0.2s';
    highlight.style.cursor = 'pointer';
    highlight.style.pointerEvents = 'auto';

    if (isCapture) {
        highlight.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        highlight.style.border = '2px solid rgba(255, 0, 0, 0.6)';
    } else {
        highlight.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
        highlight.style.border = '2px solid rgba(0, 255, 0, 0.6)';
    }

    highlight.addEventListener('mouseenter', function() {
        if (this.dataset.isCapture === 'true') {
            this.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
            this.style.border = '3px solid rgba(255, 0, 0, 0.8)';
        } else {
            this.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
            this.style.border = '3px solid rgba(0, 255, 0, 0.8)';
        }
        this.style.transform = 'scale(1.1)';
    });

    highlight.addEventListener('mouseleave', function() {
        if (this.dataset.isCapture === 'true') {
            this.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
            this.style.border = '2px solid rgba(255, 0, 0, 0.6)';
        } else {
            this.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
            this.style.border = '2px solid rgba(0, 255, 0, 0.6)';
        }
        this.style.transform = 'scale(1)';
    });

    highlight.style.zIndex = '100';

    const squareSize = 1.0;

    const x = (col - 3.5) * squareSize;
    const z = (7 - row - 3.5) * squareSize;

    highlight.dataset.x = x;
    highlight.dataset.z = z;

    document.body.appendChild(highlight);

    highlightedSquares.push(highlight);

    return highlight;
}

function updateHighlightPositions(canvas, eye, at, up, projectionMatrix) {
    highlightedSquares.forEach(highlight => {
        const x = parseFloat(highlight.dataset.x);
        const y = 0.01;
        const z = parseFloat(highlight.dataset.z);

        const worldPos = vec4.fromValues(x, y, z, 1.0);

        const viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, eye, at, up);

        const viewProjectionMatrix = mat4.create();
        mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

        const clipPos = vec4.create();
        vec4.transformMat4(clipPos, worldPos, viewProjectionMatrix);

        const ndcX = clipPos[0] / clipPos[3];
        const ndcY = clipPos[1] / clipPos[3];

        const screenX = (ndcX + 1) * 0.5 * canvas.width;
        const screenY = (1 - (ndcY + 1) * 0.5) * canvas.height;

        highlight.style.left = `${screenX - 30}px`;
        highlight.style.top = `${screenY - 30}px`;

        const distance = vec3.distance(eye, [x, y, z]);
        const scale = Math.max(0.5, Math.min(1.5, 10 / distance));
        highlight.style.transform = `scale(${scale})`;
    });
}

let currentMoveSource = null;

let onMoveMade = null;

function showValidMoves(chessRules, board, fromRow, fromCol, canvas, eye, at, up, projectionMatrix, moveCallback) {
    clearHighlights();

    currentMoveSource = { row: fromRow, col: fromCol };

    onMoveMade = moveCallback;

    const piece = board[fromRow][fromCol];
    if (!piece) return;

    const pieceColor = piece[0];

    for (let toRow = 0; toRow < 8; toRow++) {
        for (let toCol = 0; toCol < 8; toCol++) {
            if (toRow === fromRow && toCol === fromCol) {
                continue;
            }

            if (chessRules.isValidMove(board, fromRow, fromCol, toRow, toCol)) {
                const targetPiece = board[toRow][toCol];
                const isCapture = targetPiece !== null && targetPiece[0] !== pieceColor;

                let isEnPassantCapture = false;
                if (piece[1] === 'p' && fromCol !== toCol && !targetPiece) {
                    if (chessRules.enPassantTarget &&
                        chessRules.enPassantTarget.row === toRow &&
                        chessRules.enPassantTarget.col === toCol) {
                        isEnPassantCapture = true;
                    }
                }

                const highlight = createHighlight(toRow, toCol, isCapture || isEnPassantCapture);

                highlight.addEventListener('click', function() {
                    const destRow = parseInt(this.dataset.row);
                    const destCol = parseInt(this.dataset.col);

                    if (onMoveMade && currentMoveSource) {
                        onMoveMade(currentMoveSource.row, currentMoveSource.col, destRow, destCol);
                    }
                });
            }
        }
    }

    updateHighlightPositions(canvas, eye, at, up, projectionMatrix);
}

function clearHighlights() {
    highlightedSquares.forEach(highlight => {
        if (highlight.parentNode) {
            highlight.parentNode.removeChild(highlight);
        }
    });
    highlightedSquares = [];
}

export { showValidMoves, clearHighlights, updateHighlightPositions };
