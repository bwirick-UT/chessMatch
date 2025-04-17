// Move highlighting for chess game

// Store highlighted squares
let highlightedSquares = [];

// Create a highlight indicator for a square
function createHighlight(row, col, isCapture = false) {
    // Check if a highlight already exists for this square
    const existingHighlight = document.getElementById(`highlight-${row}-${col}`);
    if (existingHighlight) {
        // Update the highlight color if needed
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

    // Create a new highlight element
    const highlight = document.createElement('div');
    highlight.id = `highlight-${row}-${col}`;
    highlight.className = 'move-highlight';
    highlight.dataset.row = row;
    highlight.dataset.col = col;
    highlight.dataset.isCapture = isCapture ? 'true' : 'false';

    // Style the highlight
    highlight.style.position = 'absolute';
    highlight.style.width = '60px';
    highlight.style.height = '60px';
    highlight.style.borderRadius = '5px'; // Square with slightly rounded corners
    highlight.style.transition = 'background-color 0.2s, border 0.2s, transform 0.2s';
    highlight.style.cursor = 'pointer';
    highlight.style.pointerEvents = 'auto'; // Make it clickable

    // Set color based on whether it's a capture move
    if (isCapture) {
        highlight.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        highlight.style.border = '2px solid rgba(255, 0, 0, 0.6)';
    } else {
        highlight.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
        highlight.style.border = '2px solid rgba(0, 255, 0, 0.6)';
    }

    // Add hover effect
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

    // Position the highlight based on the board coordinates
    // These values will need to be adjusted based on your board's position and size
    const squareSize = 1.0; // Size of each square in world units

    // Calculate position in 3D space
    const x = (col - 3.5) * squareSize;
    const z = (7 - row - 3.5) * squareSize; // Flip row to match our coordinate system

    // Store the 3D position for later use
    highlight.dataset.x = x;
    highlight.dataset.z = z;

    // Add to the document
    document.body.appendChild(highlight);

    // Add to the list of highlighted squares
    highlightedSquares.push(highlight);

    return highlight;
}

// Update the position of highlights based on camera view
function updateHighlightPositions(canvas, eye, at, up, projectionMatrix) {
    highlightedSquares.forEach(highlight => {
        // Get the 3D position of the highlight
        const x = parseFloat(highlight.dataset.x);
        const y = 0.01; // Slightly above the board
        const z = parseFloat(highlight.dataset.z);

        // Project the 3D position to screen coordinates
        const worldPos = vec4.fromValues(x, y, z, 1.0);

        // Create view matrix
        const viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, eye, at, up);

        // Create combined view-projection matrix
        const viewProjectionMatrix = mat4.create();
        mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

        // Transform world position to clip space
        const clipPos = vec4.create();
        vec4.transformMat4(clipPos, worldPos, viewProjectionMatrix);

        // Perspective division to get NDC coordinates
        const ndcX = clipPos[0] / clipPos[3];
        const ndcY = clipPos[1] / clipPos[3];

        // Convert NDC to screen coordinates
        const screenX = (ndcX + 1) * 0.5 * canvas.width;
        const screenY = (1 - (ndcY + 1) * 0.5) * canvas.height;

        // Update highlight position
        highlight.style.left = `${screenX - 30}px`; // Center the highlight (60px width / 2 = 30px)
        highlight.style.top = `${screenY - 30}px`;  // Center the highlight (60px height / 2 = 30px)

        // Adjust size based on distance from camera
        const distance = vec3.distance(eye, [x, y, z]);
        const scale = Math.max(0.5, Math.min(1.5, 10 / distance));
        highlight.style.transform = `scale(${scale})`;
    });
}

// Store the source position for the current move
let currentMoveSource = null;

// Callback for when a move is made
let onMoveMade = null;

// Show highlights for valid moves
function showValidMoves(chessRules, board, fromRow, fromCol, canvas, eye, at, up, projectionMatrix, moveCallback) {
    // Clear existing highlights
    clearHighlights();

    // Store the source position
    currentMoveSource = { row: fromRow, col: fromCol };

    // Store the callback
    onMoveMade = moveCallback;

    // Get the piece color
    const piece = board[fromRow][fromCol];
    if (!piece) return;

    const pieceColor = piece[0];

    // Check all possible destination squares
    for (let toRow = 0; toRow < 8; toRow++) {
        for (let toCol = 0; toCol < 8; toCol++) {
            // Skip the source square
            if (toRow === fromRow && toCol === fromCol) {
                continue;
            }

            // Check if the move is valid
            if (chessRules.isValidMove(board, fromRow, fromCol, toRow, toCol)) {
                // Check if this is a capture move (target square has an opponent's piece)
                const targetPiece = board[toRow][toCol];
                const isCapture = targetPiece !== null && targetPiece[0] !== pieceColor;

                // Special case for en passant capture
                let isEnPassantCapture = false;
                if (piece[1] === 'p' && fromCol !== toCol && !targetPiece) {
                    // This might be an en passant capture
                    if (chessRules.enPassantTarget &&
                        chessRules.enPassantTarget.row === toRow &&
                        chessRules.enPassantTarget.col === toCol) {
                        isEnPassantCapture = true;
                    }
                }

                // Create a highlight for this valid move
                const highlight = createHighlight(toRow, toCol, isCapture || isEnPassantCapture);

                // Add click event to the highlight
                highlight.addEventListener('click', function() {
                    const destRow = parseInt(this.dataset.row);
                    const destCol = parseInt(this.dataset.col);

                    // Call the move callback if provided
                    if (onMoveMade && currentMoveSource) {
                        onMoveMade(currentMoveSource.row, currentMoveSource.col, destRow, destCol);
                    }
                });
            }
        }
    }

    // Update highlight positions
    updateHighlightPositions(canvas, eye, at, up, projectionMatrix);
}

// Clear all highlights
function clearHighlights() {
    highlightedSquares.forEach(highlight => {
        if (highlight.parentNode) {
            highlight.parentNode.removeChild(highlight);
        }
    });
    highlightedSquares = [];
}

export { showValidMoves, clearHighlights, updateHighlightPositions };
