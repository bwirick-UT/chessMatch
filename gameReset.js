function createNewGameButton(onReset) {
    let resetButton = document.getElementById('new-game-button');

    if (!resetButton) {
        resetButton = document.createElement('button');
        resetButton.id = 'new-game-button';
        resetButton.textContent = 'New Game';
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
        resetButton.onmouseover = function() {
            this.style.backgroundColor = '#45a049';
        };
        resetButton.onmouseout = function() {
            this.style.backgroundColor = '#4CAF50';
        };

        resetButton.onclick = function() {
            onReset();
            hideNewGameButton();
        };

        document.body.appendChild(resetButton);
    }

    resetButton.style.display = 'block';

    return resetButton;
}

function hideNewGameButton() {
    const resetButton = document.getElementById('new-game-button');
    if (resetButton) {
        resetButton.style.display = 'none';
    }
}

function resetGame(chessSet, chessRules, camera, updateStatusMessage) {
    chessSet.resetBoard();

    chessRules.resetGame();

    camera.eye = [0, 6, 9];
    camera.at = [0, 1.5, 2.3];
    camera.up = [0, 1, 0];

    if (updateStatusMessage) {
        updateStatusMessage();
    }

    hideNewGameButton();

    if (window.hauntedPiece) {
        window.hauntedPiece.onPlayerChanged();
    }

    console.log('Game reset');
}

export { createNewGameButton, hideNewGameButton, resetGame };
