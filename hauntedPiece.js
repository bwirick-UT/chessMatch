import { setShaderAttributes } from "./helpers.js";

class HauntedPiece {
    constructor(gl, chessSet, chessRules) {
        console.log("HauntedPiece constructor called");
        this.gl = gl;
        this.chessSet = chessSet;
        this.chessRules = chessRules;

        this.mouseX = 0;
        this.mouseY = 0;

        this.selectedPiece = null;
        this.selectedRow = null;
        this.selectedCol = null;
        this.pieceModel = null;
        this.pieceColor = null;

        this.rotationAngle = 0;

        console.log("Current player:", this.chessRules.currentPlayer);
        console.log("Chess board state:", this.chessSet.board);

        this.selectRandomPiece();
    }

    selectRandomPiece() {
        console.log("Selecting random piece...");

        if (!this.chessRules || !this.chessSet || !this.chessSet.board) {
            console.error("Chess rules or board not initialized");
            return;
        }

        const currentPlayer = this.chessRules.currentPlayer;
        console.log("Current player for haunted piece:", currentPlayer);

        const playerColor = currentPlayer || 'w';

        const eligiblePieces = [];

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

        if (eligiblePieces.length > 0) {
            const randomIndex = Math.floor(Math.random() * eligiblePieces.length);
            const selected = eligiblePieces[randomIndex];

            this.selectedPiece = selected.piece;
            this.selectedRow = selected.row;
            this.selectedCol = selected.col;
            this.pieceModel = this.chessSet.getPieceModel(selected.piece);
            this.pieceColor = selected.piece[0];

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

    updatePosition(mouseX, mouseY, canvas, eye, at, up, projectionMatrix) {
        this.mouseX = mouseX;
        this.mouseY = mouseY;

        if (!this.selectedPiece) {
            return;
        }

        const x = this.selectedCol - 3.5;
        const y = 0;
        const z = (7 - this.selectedRow) - 3.5;

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

        const dx = mouseX - screenX;
        const dy = mouseY - screenY;

        this.rotationAngle = Math.atan2(dx, dy);
    }

    draw(gl, shaderProgram, currentTime) {
    }

    applyRotation(modelViewMatrix, row, col) {
        if (this.selectedPiece && row === this.selectedRow && col === this.selectedCol) {
            mat4.rotateY(modelViewMatrix, modelViewMatrix, this.rotationAngle);

            const floatOffset = Math.sin(Date.now() * 0.002) * 0.05;
            mat4.translate(modelViewMatrix, modelViewMatrix, [0, floatOffset, 0]);

            return true;
        }
        return false;
    }

    onPlayerChanged() {
        console.log("Player changed, selecting new haunted piece");
        this.selectRandomPiece();
    }
}

export { HauntedPiece };
