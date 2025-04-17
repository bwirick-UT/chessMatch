const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create HTTP server that serves files
const httpServer = http.createServer((req, res) => {
    // Get the file path
    let filePath = '../' + (req.url === '/' ? 'index.html' : req.url);

    // Remove query parameters if any
    filePath = filePath.split('?')[0];

    // Get the file extension
    const extname = path.extname(filePath);

    // Set the content type based on the file extension
    let contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
            contentType = 'image/jpg';
            break;
    }

    // Read the file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // File not found
                res.writeHead(404);
                res.end('File not found');
            } else {
                // Server error
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Create WebSocket server using the HTTP server
const server = new WebSocket.Server({ server: httpServer });

// Track active games
const games = new Map();

// Generate a random game ID
function generateGameId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create a new game
function createGame(whitePlayer) {
    const gameId = generateGameId();
    games.set(gameId, {
        whitePlayer,
        blackPlayer: null,
        moves: [],
        currentPlayer: 'w' // White starts
    });
    console.log(`Game created: ${gameId}`);
    return gameId;
}

// Broadcast game state to both players
function broadcastGameState(gameId) {
    if (!games.has(gameId)) return;

    const game = games.get(gameId);

    // Notify white player
    if (game.whitePlayer && game.whitePlayer.readyState === WebSocket.OPEN) {
        game.whitePlayer.send(JSON.stringify({
            type: 'game_state',
            gameId,
            color: 'w',
            moves: game.moves,
            currentPlayer: game.currentPlayer
        }));
    }

    // Notify black player
    if (game.blackPlayer && game.blackPlayer.readyState === WebSocket.OPEN) {
        game.blackPlayer.send(JSON.stringify({
            type: 'game_state',
            gameId,
            color: 'b',
            moves: game.moves,
            currentPlayer: game.currentPlayer
        }));
    }

    // If both players are connected, notify that the game can start
    if (game.whitePlayer && game.blackPlayer) {
        // Notify white player that black joined
        if (game.whitePlayer.readyState === WebSocket.OPEN) {
            game.whitePlayer.send(JSON.stringify({
                type: 'player_joined',
                gameId,
                color: 'b'
            }));
        }

        // Notify black player that they joined successfully
        if (game.blackPlayer.readyState === WebSocket.OPEN) {
            game.blackPlayer.send(JSON.stringify({
                type: 'player_joined',
                gameId,
                color: 'w'
            }));
        }
    }
}

// Broadcast a move to both players
function broadcastMove(gameId, move) {
    if (!games.has(gameId)) return;

    const game = games.get(gameId);

    // Add move to game history
    game.moves.push(move);

    // Toggle current player
    game.currentPlayer = game.currentPlayer === 'w' ? 'b' : 'w';
    console.log(`Game ${gameId}: Current player is now ${game.currentPlayer}`);

    // Broadcast to white player
    if (game.whitePlayer && game.whitePlayer.readyState === WebSocket.OPEN) {
        game.whitePlayer.send(JSON.stringify({
            type: 'move',
            gameId,
            move,
            currentPlayer: game.currentPlayer
        }));
    }

    // Broadcast to black player
    if (game.blackPlayer && game.blackPlayer.readyState === WebSocket.OPEN) {
        game.blackPlayer.send(JSON.stringify({
            type: 'move',
            gameId,
            move,
            currentPlayer: game.currentPlayer
        }));
    }

    // Log the current state of the game
    console.log(`Game ${gameId} state: ${game.moves.length} moves made, current player: ${game.currentPlayer}`);
}

// Handle client connections
server.on('connection', (ws) => {
    console.log('Client connected');
    let gameId = null;
    let playerColor = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received message:', data);

            switch(data.type) {
                case 'create_game':
                    gameId = createGame(ws);
                    playerColor = 'w'; // First player is always white
                    console.log(`Player assigned color: ${playerColor} for game: ${gameId}`);
                    ws.send(JSON.stringify({
                        type: 'game_created',
                        gameId,
                        color: playerColor
                    }));
                    break;

                case 'join_game':
                    if (games.has(data.gameId)) {
                        const game = games.get(data.gameId);

                        // Check if the game already has a black player
                        if (game.blackPlayer) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Game is full'
                            }));
                            return;
                        }

                        gameId = data.gameId;
                        playerColor = 'b'; // Second player is always black
                        console.log(`Player assigned color: ${playerColor} for game: ${gameId}`);
                        game.blackPlayer = ws;

                        // Send confirmation to the joining player
                        ws.send(JSON.stringify({
                            type: 'game_created', // Reuse the same message type for simplicity
                            gameId,
                            color: playerColor
                        }));

                        // Notify both players that the game can start
                        broadcastGameState(gameId);
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Game not found'
                        }));
                    }
                    break;

                case 'move':
                    if (gameId && games.has(gameId)) {
                        const game = games.get(gameId);

                        // Validate player's turn
                        if (playerColor !== game.currentPlayer) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Not your turn'
                            }));
                            return;
                        }

                        // Broadcast move to both players
                        broadcastMove(gameId, data.move);
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Invalid game'
                        }));
                    }
                    break;

                default:
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Unknown message type'
                    }));
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });

    // Handle disconnection
    ws.on('close', () => {
        console.log('Client disconnected');

        // If the client was in a game, notify the other player
        if (gameId && games.has(gameId)) {
            const game = games.get(gameId);

            // Determine which player disconnected and notify the other
            if (playerColor === 'w' && game.blackPlayer) {
                game.blackPlayer.send(JSON.stringify({
                    type: 'player_disconnected',
                    color: 'w'
                }));
            } else if (playerColor === 'b' && game.whitePlayer) {
                game.whitePlayer.send(JSON.stringify({
                    type: 'player_disconnected',
                    color: 'b'
                }));
            }
        }
    });
});

// Start the HTTP server
const PORT = 8080;
httpServer.listen(PORT, () => {
    console.log(`Chess multiplayer server running on port ${PORT}`);
});
