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
    }

    connect() {
        try {
            console.log('Attempting to connect to WebSocket server...');
            // Use the same origin for WebSocket connection to avoid CORS issues
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            console.log(`Connecting to WebSocket at: ${wsUrl}`);
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('Connected to game server');
                // Update UI to show connected status
                this.updateGameUI();
            };

            this.ws.onclose = (event) => {
                console.log(`Disconnected from game server: ${event.code} ${event.reason}`);
                this.active = false;
                this.updateGameUI();

                // Try to reconnect after a delay if it wasn't a normal closure
                if (event.code !== 1000) {
                    console.log('Attempting to reconnect in 5 seconds...');
                    setTimeout(() => this.connect(), 5000);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                // Show error message to user
                const status = document.getElementById('multiplayer-status');
                if (status) {
                    status.textContent = 'Error connecting to server. Please check if the server is running.';
                    status.style.color = 'red';
                }
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('Received message:', data);

                switch(data.type) {
                    case 'game_created':
                        this.gameId = data.gameId;
                        this.playerColor = data.color;
                        this.active = true;
                        console.log('Game created. You are playing as:', this.playerColor);
                        this.updateGameUI();
                        break;

                    case 'move':
                        console.log('Received move from server:', data.move);
                        // Only apply the move if it's from the opponent
                        const moveFromOpponent = data.currentPlayer === this.playerColor;
                        if (moveFromOpponent) {
                            console.log('Applying opponent move');
                            this.applyRemoteMove(data.move);
                        } else {
                            console.log('Ignoring own move reflected back from server');
                        }
                        break;

                    case 'player_joined':
                        // Start game
                        this.active = true;
                        console.log('Player joined. Game is starting. You are playing as:', this.playerColor);
                        // Call the startGame method if available
                        if (typeof this.gameManager.startGame === 'function') {
                            this.gameManager.startGame();
                        }
                        this.updateGameUI();
                        break;

                    case 'error':
                        console.error('Server error:', data.message);
                        alert('Game error: ' + data.message);
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

            // Get chess rules and chess set from the game manager
            const chessRules = this.gameManager.chessRules;
            const chessSet = this.gameManager.chessSet;

            // Apply the move locally first
            if (chessRules && chessSet && chessSet.board) {
                // Make the move using chess rules
                chessRules.makeMove(chessSet.board, fromRow, fromCol, toRow, toCol);

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

        console.log(`Remote move: ${chessSet.board[fromRow][fromCol]} from [${fromRow}, ${fromCol}] to [${toRow}, ${toCol}]`);
        console.log('Current player before move:', chessRules.currentPlayer);

        // Apply the move
        if (chessRules.isValidMove(chessSet.board, fromRow, fromCol, toRow, toCol)) {
            // Make the move using chess rules
            chessRules.makeMove(chessSet.board, fromRow, fromCol, toRow, toCol);
            console.log('Current player after move:', chessRules.currentPlayer);

            // Update the status message if available
            if (typeof updateStatusMessage === 'function') {
                updateStatusMessage(true);
            }

            // Rotate camera for the next player
            if (camera) {
                camera.rotateForPlayerChange(performance.now() * 0.001);
            }

            // Update the haunted piece when player changes
            if (window.hauntedPiece) {
                window.hauntedPiece.onPlayerChanged();
            }

            // Update the UI to show whose turn it is
            this.updateGameUI();
        } else {
            console.error('Invalid remote move received');
        }
    }

    updateGameUI() {
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

        // Check WebSocket connection status
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            statusElement.textContent = 'Connecting to server...';
            statusElement.style.color = 'yellow';
            return;
        }

        // Reset color to white (in case it was changed for error messages)
        statusElement.style.color = 'white';

        if (this.active) {
            if (this.gameId) {
                // Get the current player from chess rules
                const currentPlayer = this.gameManager.chessRules ? this.gameManager.chessRules.currentPlayer : null;
                const isYourTurn = currentPlayer === this.playerColor;

                // Show game status with turn information
                statusElement.textContent = `Game ID: ${this.gameId} | You are playing as ${this.playerColor === 'w' ? 'White' : 'Black'} | ${isYourTurn ? 'YOUR TURN' : 'Waiting for opponent'}`;

                // Highlight when it's your turn
                statusElement.style.color = isYourTurn ? '#00ff00' : 'white';

                // Show game ID in the input field for easy sharing
                const gameIdInput = document.getElementById('game-id');
                if (gameIdInput) {
                    gameIdInput.value = this.gameId;
                }
            } else {
                statusElement.textContent = 'Connected to server, waiting for game...';
            }
        } else {
            statusElement.textContent = 'Connected to server. Create or join a game to start playing.';
        }
    }

    isActive() {
        return this.active;
    }
}