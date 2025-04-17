// Floating pieces effect - makes all chess pieces float with random bobbing animations
import { setShaderAttributes } from "./helpers.js";

class FloatingPieces {
    constructor(gl, chessSet) {
        console.log("FloatingPieces constructor called");
        this.gl = gl;
        this.chessSet = chessSet;
        
        // Floating parameters for each piece
        this.floatingParams = {};
        
        // Initialize random floating parameters for each piece
        this.initFloatingParams();
    }
    
    // Initialize random floating parameters for each piece
    initFloatingParams() {
        console.log("Initializing floating parameters for all pieces");
        
        // Make sure the chess set and board are initialized
        if (!this.chessSet || !this.chessSet.board) {
            console.error("Chess set or board not initialized");
            return;
        }
        
        // Generate random parameters for each piece on the board
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.chessSet.board[row][col];
                if (piece) {
                    // Create a unique key for this piece position
                    const key = `${row}-${col}`;
                    
                    // Generate random parameters for this piece
                    this.floatingParams[key] = {
                        // Random speed (frequency) between 0.001 and 0.003
                        speed: 0.001 + Math.random() * 0.002,
                        
                        // Random amplitude between 0.02 and 0.06
                        amplitude: 0.02 + Math.random() * 0.04,
                        
                        // Random phase offset between 0 and 2π
                        phaseOffset: Math.random() * Math.PI * 2,
                        
                        // Random horizontal movement (optional)
                        horizontalAmplitude: Math.random() * 0.01,
                        horizontalSpeed: 0.0005 + Math.random() * 0.001,
                        horizontalPhaseOffset: Math.random() * Math.PI * 2
                    };
                }
            }
        }
    }
    
    // Apply floating effect to a piece during rendering
    applyFloating(modelViewMatrix, row, col, currentTime) {
        // Create a unique key for this piece position
        const key = `${row}-${col}`;
        
        // Check if we have floating parameters for this piece
        if (this.floatingParams[key]) {
            const params = this.floatingParams[key];
            
            // Calculate vertical floating offset using sine wave
            const verticalOffset = params.amplitude * 
                Math.sin(currentTime * 1000 * params.speed + params.phaseOffset);
            
            // Calculate horizontal floating offset (subtle side-to-side movement)
            const horizontalOffset = params.horizontalAmplitude * 
                Math.sin(currentTime * 1000 * params.horizontalSpeed + params.horizontalPhaseOffset);
            
            // Apply the floating transformation
            mat4.translate(modelViewMatrix, modelViewMatrix, [horizontalOffset, verticalOffset, 0]);
            
            return true;
        }
        
        return false;
    }
    
    // Update method - called on each frame
    update(currentTime) {
        // Nothing to update here, as we calculate everything in applyFloating
    }
    
    // Reset floating parameters (e.g., when the board is reset)
    reset() {
        this.floatingParams = {};
        this.initFloatingParams();
    }
}

export { FloatingPieces };
