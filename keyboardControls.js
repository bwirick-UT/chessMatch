function initKeyboardControls(chessRules) {
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (window.chessSelection && window.chessSelection.selectedPiece) {
                window.chessSelection.selectedPiece = null;
                window.chessSelection.selectedPosition = null;

                if (typeof window.clearHighlights === 'function') {
                    window.clearHighlights();
                }

                console.log('Selection canceled with ESC key');
            }
        }
    });
}

export { initKeyboardControls };
