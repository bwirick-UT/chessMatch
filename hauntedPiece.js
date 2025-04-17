// Haunted piece effect - a random piece on the board rotates to follow the mouse cursor
import { setShaderAttributes } from "./helpers.js";

class HauntedPiece {
    constructor(gl, chessSet, chessRules) {
        console.log("HauntedPiece constructor called");
        this.gl = gl;
        this.chessSet = chessSet;
        this.chessRules = chessRules;

        // Mouse tracking
        this.mouseX = 0;
        this.mouseY = 0;

        // Selected piece properties
        this.selectedPiece = null;
        this.selectedRow = null;
        this.selectedCol = null;
        this.pieceModel = null;
        this.pieceColor = null;

        // Rotation angle
        this.rotationAngle = 0;

        console.log("Current player:", this.chessRules.currentPlayer);
        console.log("Chess board state:", this.chessSet.board);

        // Select a random piece initially
        this.selectRandomPiece();
    }

    // Select a random non-pawn piece from the current player
    selectRandomPiece() {
        console.log("Selecting random piece...");

        // Make sure chessRules and board are initialized
        if (!this.chessRules || !this.chessSet || !this.chessSet.board) {
            console.error("Chess rules or board not initialized");
            return;
        }

        const currentPlayer = this.chessRules.currentPlayer; // 'w' or 'b'
        console.log("Current player for haunted piece:", currentPlayer);

        // If current player is not set, default to white
        const playerColor = currentPlayer || 'w';

        const eligiblePieces = [];

        // Find all non-pawn pieces of the current player
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.chessSet.board[row][col];
                if (piece && piece[0] === playerColor && piece[1] !== 'p') {
                    console.log(`Found eligible piece: ${piece} at [${row}, ${col}]`);
                    eligiblePieces.push({
                        piece: piece,
                        row: row,
                        col: col
                    });
                }
            }
        }

        console.log("Total eligible pieces found:", eligiblePieces.length);

        // If there are eligible pieces, select one randomly
        if (eligiblePieces.length > 0) {
            const randomIndex = Math.floor(Math.random() * eligiblePieces.length);
            const selected = eligiblePieces[randomIndex];

            this.selectedPiece = selected.piece;
            this.selectedRow = selected.row;
            this.selectedCol = selected.col;
            this.pieceModel = this.chessSet.getPieceModel(selected.piece);
            this.pieceColor = selected.piece[0]; // 'w' or 'b'

            console.log(`Haunted piece selected: ${this.selectedPiece} at [${this.selectedRow}, ${this.selectedCol}]`);
            console.log(`Piece model: ${this.pieceModel}, Color: ${this.pieceColor}`);
        } else {
            console.log("No eligible pieces found for haunted effect");
            this.selectedPiece = null;
            this.selectedRow = null;
            this.selectedCol = null;
            this.pieceModel = null;
            this.pieceColor = null;
        }
    }

    // Update the rotation angle based on mouse position
    updatePosition(mouseX, mouseY, canvas, eye, at, up, projectionMatrix) {
        // Store mouse position
        this.mouseX = mouseX;
        this.mouseY = mouseY;

        // If no piece is selected, nothing to update
        if (!this.selectedPiece) {
            return;
        }

        // Calculate the position of the selected piece on the board
        const x = this.selectedCol - 3.5;  // Center the board
        const y = 0;                      // On the board surface
        const z = (7 - this.selectedRow) - 3.5;  // Center the board and flip rows

        // Project piece position to screen coordinates
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

        // Calculate angle from piece to mouse
        const dx = mouseX - screenX;
        const dy = mouseY - screenY;

        // Calculate angle in radians
        this.rotationAngle = Math.atan2(dx, dy);
    }

    // Draw method - this is called by the main render loop
    // We don't actually draw anything here, as the piece is drawn by the ChessSet
    // We just need to modify the rotation of the selected piece
    draw(gl, shaderProgram, currentTime) {
        // We don't need to do anything here, as we'll modify the ChessSet's draw method
        // to apply our rotation to the selected piece
    }

    // Method to apply rotation to a piece during the ChessSet's draw method
    applyRotation(modelViewMatrix, row, col) {
        // Check if this is our selected piece
        if (this.selectedPiece && row === this.selectedRow && col === this.selectedCol) {
            // Apply the rotation based on mouse position
            mat4.rotateY(modelViewMatrix, modelViewMatrix, this.rotationAngle);

            // Add a slight bobbing motion for spooky effect
            const floatOffset = Math.sin(Date.now() * 0.002) * 0.05;
            mat4.translate(modelViewMatrix, modelViewMatrix, [0, floatOffset, 0]);

            return true;
        }
        return false;
    }

    // Update the haunted piece when the current player changes
    onPlayerChanged() {
        console.log("Player changed, selecting new haunted piece");
        this.selectRandomPiece();
    }
}

export { HauntedPiece };
