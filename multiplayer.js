export class ChessMultiplayer {
    constructor(gameManager) {
        this.ws = null;
        this.gameManager = gameManager;
        this.gameId = null;
        this.playerColor = null;
        this.active = false;

        // Connect to WebSocket server
        this.connect();

        // Set up event listeners for UI buttons
        this.setupEventListeners();

        console.log('ChessMultiplayer initialized');
    }

    connect() {
        try {
            console.log('Connecting to WebSocket server...');
            // Use localhost:8080 for development
            const wsUrl = 'ws://localhost:8080';
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('Connected to game server');
                this.updateGameUI('Connected to server. Create or join a game.');
            };

            this.ws.onclose = (event) => {
                console.log(`Disconnected from game server: ${event.code}`);
                this.active = false;
                this.updateGameUI('Disconnected from server. Reconnecting...');

                // Try to reconnect after a delay
                setTimeout(() => this.connect(), 3000);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateGameUI('Error connecting to server. Is the server running?', 'red');
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('Received message:', data);

                switch(data.type) {
                    case 'game_created':
                        this.gameId = data.gameId;
                        this.playerColor = 'w'; // First player is always white
                        this.active = false; // Game not active until second player joins
                        console.log('Game created. You are WHITE. Waiting for another player to join.');
                        console.log('Player color set to:', this.playerColor);
                        this.updateGameUI(`Game created! You are WHITE. Game ID: ${this.gameId} - Share this with your opponent.`);
                        break;

                    case 'game_joined':
                        this.gameId = data.gameId;
                        this.playerColor = 'b'; // Second player is always black
                        console.log('Joined game as BLACK. Waiting for game to start.');
                        console.log('Player color set to:', this.playerColor);
                        this.updateGameUI(`Joined game as BLACK. Game ID: ${this.gameId} - Waiting for game to start...`);
                        break;

                    case 'game_started':
                        this.gameId = data.gameId;
                        this.active = true;

                        // Reset the board and set current player to white
                        if (this.gameManager.chessRules) {
                            this.gameManager.chessRules.currentPlayer = 'w';
                            if (this.gameManager.chessSet) {
                                this.gameManager.chessSet.resetBoard();
                            }
                        }

                        console.log(`Game started! You are ${this.playerColor === 'w' ? 'WHITE' : 'BLACK'}`);
                        console.log('Player color is still:', this.playerColor);

                        // Update UI based on player color and whose turn it is
                        if (this.playerColor === 'w') {
                            this.updateGameUI(`Game started! You are WHITE - Your turn to move.`, '#00ff00');
                        } else {
                            this.updateGameUI(`Game started! You are BLACK - Waiting for WHITE to move.`, 'yellow');
                        }
                        break;

                    case 'move':
                        console.log('Received move from server:', data.move);

                        // Check if this is a move from the other player
                        const moveFromOtherPlayer =
                            (this.playerColor === 'w' && data.currentPlayer === 'w') ||
                            (this.playerColor === 'b' && data.currentPlayer === 'b');

                        if (moveFromOtherPlayer) {
                            // This is a move from the other player, apply it
                            console.log(`Applying move from ${this.playerColor === 'w' ? 'BLACK' : 'WHITE'} player`);
                            this.applyRemoteMove(data.move);

                            // Update UI to show it's now our turn
                            if (this.playerColor === 'w') {
                                this.updateGameUI(`BLACK moved. You are WHITE - Your turn.`, '#00ff00');
                            } else {
                                this.updateGameUI(`WHITE moved. You are BLACK - Your turn.`, '#00ff00');
                            }
                        } else {
                            // This is confirmation of our own move
                            console.log(`Server confirmed our move as ${this.playerColor === 'w' ? 'WHITE' : 'BLACK'}`);

                            // Update UI to show it's the other player's turn
                            if (this.playerColor === 'w') {
                                this.updateGameUI(`You moved. You are WHITE - Waiting for BLACK.`, 'yellow');
                            } else {
                                this.updateGameUI(`You moved. You are BLACK - Waiting for WHITE.`, 'yellow');
                            }
                        }
                        break;

                    case 'error':
                        console.error('Server error:', data.message);
                        this.updateGameUI(`Error: ${data.message}`, 'red');
                        break;

                    case 'player_disconnected':
                        console.log('Player disconnected:', data.color);
                        this.active = false;
                        this.updateGameUI(`The ${data.color === 'w' ? 'WHITE' : 'BLACK'} player disconnected.`, 'red');
                        break;
                }
            };
        } catch (error) {
            console.error('Error setting up WebSocket connection:', error);
        }
    }

    setupEventListeners() {
        // Create game button
        const createGameBtn = document.getElementById('create-game');
        if (createGameBtn) {
            createGameBtn.addEventListener('click', () => this.createGame());
        }

        // Join game button
        const joinGameBtn = document.getElementById('join-game');
        if (joinGameBtn) {
            joinGameBtn.addEventListener('click', () => {
                const gameIdInput = document.getElementById('game-id');
                if (gameIdInput && gameIdInput.value) {
                    this.joinGame(gameIdInput.value);
                } else {
                    alert('Please enter a game ID');
                }
            });
        }
    }

    createGame() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'create_game'
            }));
        } else {
            console.error('WebSocket not connected');
            alert('Cannot connect to game server. Please try again later.');
        }
    }

    joinGame(gameId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'join_game',
                gameId: gameId
            }));
        } else {
            console.error('WebSocket not connected');
            alert('Cannot connect to game server. Please try again later.');
        }
    }

    sendMove(fromRow, fromCol, toRow, toCol) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('Sending move to server:', fromRow, fromCol, toRow, toCol);
            console.log('Player color:', this.playerColor);

            // Check if game is active
            if (!this.active) {
                console.error('Game not active yet');
                return;
            }

            // Get chess rules and chess set from the game manager
            const chessRules = this.gameManager.chessRules;
            const chessSet = this.gameManager.chessSet;

            // Check if it's this player's turn
            if ((this.playerColor === 'w' && chessRules.currentPlayer !== 'w') ||
                (this.playerColor === 'b' && chessRules.currentPlayer !== 'b')) {
                console.error(`Not your turn. Current player: ${chessRules.currentPlayer}, Your color: ${this.playerColor}`);
                return;
            }

            console.log(`You are ${this.playerColor === 'w' ? 'WHITE' : 'BLACK'} - sending move to server`);

            // Apply the move locally first
            if (chessRules && chessSet && chessSet.board) {
                // Make the move using chess rules but don't update the current player
                // We're passing false to the updateGameState parameter to prevent switching players
                chessRules.makeMove(chessSet.board, fromRow, fromCol, toRow, toCol, false);

                // Update the UI
                if (typeof updateStatusMessage === 'function') {
                    updateStatusMessage(true);
                }
            }

            // Then send it to the server
            this.ws.send(JSON.stringify({
                type: 'move',
                gameId: this.gameId,
                move: {
                    fromRow: fromRow,
                    fromCol: fromCol,
                    toRow: toRow,
                    toCol: toCol
                }
            }));

            // Update the UI to show it's now the opponent's turn
            this.updateGameUI();
        } else {
            console.error('WebSocket not connected, cannot send move');
        }
    }

    applyRemoteMove(move) {
        // Extract move data
        const { fromRow, fromCol, toRow, toCol } = move;

        // Get chess rules from the game manager
        const chessRules = this.gameManager.chessRules;
        const chessSet = this.gameManager.chessSet;
        const camera = this.gameManager.camera;

        // Make sure we have valid objects
        if (!chessRules || !chessSet || !chessSet.board) {
            console.error('Invalid game state objects');
            return;
        }

        // Determine which player made the move
        const movingPlayerColor = chessSet.board[fromRow][fromCol][0]; // 'w' or 'b'
        const movingPlayerName = movingPlayerColor === 'w' ? 'WHITE' : 'BLACK';

        console.log(`Applying remote move from ${movingPlayerName} player`);
        console.log(`Remote move: ${chessSet.board[fromRow][fromCol]} from [${fromRow}, ${fromCol}] to [${toRow}, ${toCol}]`);
        console.log('Current player before move:', chessRules.currentPlayer);
        console.log('Player color:', this.playerColor);

        // Apply the move
        if (chessRules.isValidMove(chessSet.board, fromRow, fromCol, toRow, toCol)) {
            // Make the move using chess rules but don't update the current player
            // We're passing false to the updateGameState parameter to prevent switching players
            // The server will tell us the new current player
            chessRules.makeMove(chessSet.board, fromRow, fromCol, toRow, toCol, false);

            // Toggle the current player locally to match the server
            chessRules.currentPlayer = chessRules.currentPlayer === 'w' ? 'b' : 'w';
            console.log('Current player after move:', chessRules.currentPlayer);

            // Update the status message if available
            if (typeof updateStatusMessage === 'function') {
                updateStatusMessage(true);
            }

            // Rotate camera to show the board from the current player's perspective
            if (camera) {
                camera.rotateForPlayerChange(performance.now() * 0.001);
            }

            // Update the haunted piece when player changes
            if (window.hauntedPiece) {
                window.hauntedPiece.onPlayerChanged();
            }

            // Update the UI to show whose turn it is
            if (this.playerColor === chessRules.currentPlayer) {
                this.updateGameUI(`${movingPlayerName} moved. You are ${this.playerColor === 'w' ? 'WHITE' : 'BLACK'} - Your turn.`, '#00ff00');
            } else {
                this.updateGameUI(`${movingPlayerName} moved. You are ${this.playerColor === 'w' ? 'WHITE' : 'BLACK'} - Waiting for ${chessRules.currentPlayer === 'w' ? 'WHITE' : 'BLACK'}.`, 'yellow');
            }
        } else {
            console.error('Invalid remote move received');
        }
    }

    updateGameUI(message, color = 'white') {
        // Update game status display
        let statusElement = document.getElementById('multiplayer-status');

        // Create status element if it doesn't exist
        if (!statusElement) {
            const statusDiv = document.createElement('div');
            statusDiv.id = 'multiplayer-status';
            statusDiv.style.position = 'absolute';
            statusDiv.style.top = '50px';
            statusDiv.style.left = '10px';
            statusDiv.style.color = 'white';
            statusDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            statusDiv.style.padding = '10px';
            statusDiv.style.borderRadius = '5px';
            statusDiv.style.fontFamily = 'Arial, sans-serif';
            statusDiv.style.zIndex = '1000';
            document.body.appendChild(statusDiv);
            statusElement = statusDiv;
        }

        // Debug information
        console.log(`UI Update: ${message}`);
        console.log(`Game state: active=${this.active}, gameId=${this.gameId}, color=${this.playerColor}`);

        // Update the status message
        statusElement.textContent = message;
        statusElement.style.color = color;

        // If we have a game ID, update the input field for easy sharing
        if (this.gameId) {
            const gameIdInput = document.getElementById('game-id');
            if (gameIdInput) {
                gameIdInput.value = this.gameId;
            }
        }
    }

    isActive() {
        return this.active;
    }
}