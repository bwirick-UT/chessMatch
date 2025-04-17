// Game reset functionality

// Create and show a new game button
function createNewGameButton(onReset) {
    // Check if a button already exists
    let resetButton = document.getElementById('new-game-button');

    // If not, create a new one
    if (!resetButton) {
        resetButton = document.createElement('button');
        resetButton.id = 'new-game-button';
        resetButton.textContent = 'New Game';

        // Style the button
        resetButton.style.position = 'fixed';
        resetButton.style.bottom = '20px';
        resetButton.style.left = '50%';
        resetButton.style.transform = 'translateX(-50%)';
        resetButton.style.padding = '10px 20px';
        resetButton.style.fontSize = '16px';
        resetButton.style.fontWeight = 'bold';
        resetButton.style.backgroundColor = '#4CAF50';
        resetButton.style.color = 'white';
        resetButton.style.border = 'none';
        resetButton.style.borderRadius = '5px';
        resetButton.style.cursor = 'pointer';
        resetButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        resetButton.style.zIndex = '1000';

        // Add hover effect
        resetButton.onmouseover = function() {
            this.style.backgroundColor = '#45a049';
        };
        resetButton.onmouseout = function() {
            this.style.backgroundColor = '#4CAF50';
        };

        // Add click event
        resetButton.onclick = function() {
            onReset();
            hideNewGameButton();
        };

        // Add to the document
        document.body.appendChild(resetButton);
    }

    // Show the button
    resetButton.style.display = 'block';

    return resetButton;
}

// Hide the new game button
function hideNewGameButton() {
    const resetButton = document.getElementById('new-game-button');
    if (resetButton) {
        resetButton.style.display = 'none';
    }
}

// Reset the game
function resetGame(chessSet, chessRules, camera, updateStatusMessage) {
    // Reset the board
    chessSet.resetBoard();

    // Reset the chess rules
    chessRules.resetGame();

    // Reset the camera to the initial position (white's view)
    camera.eye = [0, 6, 9];
    camera.at = [0, 1.5, 2.3];
    camera.up = [0, 1, 0];

    // Update the status message
    if (updateStatusMessage) {
        updateStatusMessage();
    }

    // Hide the new game button
    hideNewGameButton();

    // Update the haunted piece when the game is reset
    if (window.hauntedPiece) {
        window.hauntedPiece.onPlayerChanged();
    }

    console.log('Game reset');
}

export { createNewGameButton, hideNewGameButton, resetGame };
