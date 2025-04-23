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
console.log('WebSocket server created and attached to HTTP server');

// Track active games
const games = new Map();

// Generate a random game ID
function generateGameId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create a new game
function createGame(firstPlayer) {
    const gameId = generateGameId();
    games.set(gameId, {
        firstPlayer,  // Store first player, but don't assign color yet
        secondPlayer: null,
        whitePlayer: null,  // Will be assigned when second player joins
        blackPlayer: null,  // Will be assigned when second player joins
        moves: [],
        currentPlayer: 'w', // White starts
        started: false      // Game hasn't started yet
    });
    console.log(`Game created: ${gameId}`);
    return gameId;
}

// Start game and assign player colors
function startGame(gameId) {
    if (!games.has(gameId)) return;

    const game = games.get(gameId);

    if (!game.firstPlayer || !game.secondPlayer) {
        console.error(`Cannot start game ${gameId}: missing players`);
        return;
    }

    // First player is always white, second player is always black
    game.whitePlayer = game.firstPlayer;
    game.blackPlayer = game.secondPlayer;

    console.log(`Game ${gameId}: First player is white, second player is black`);

    game.started = true;
    game.currentPlayer = 'w'; // White always starts

    console.log(`Game ${gameId} started. First player is white, second player is black`);

    // Notify white player
    if (game.whitePlayer && game.whitePlayer.readyState === WebSocket.OPEN) {
        game.whitePlayer.send(JSON.stringify({
            type: 'game_started',
            gameId,
            moves: game.moves,
            currentPlayer: game.currentPlayer
        }));
    }

    // Notify black player
    if (game.blackPlayer && game.blackPlayer.readyState === WebSocket.OPEN) {
        game.blackPlayer.send(JSON.stringify({
            type: 'game_started',
            gameId,
            moves: game.moves,
            currentPlayer: game.currentPlayer
        }));
    }
}

// Broadcast a move to both players
function broadcastMove(gameId, move) {
    if (!games.has(gameId)) {
        console.error(`Game ${gameId} not found when broadcasting move`);
        return;
    }

    const game = games.get(gameId);
    console.log(`Broadcasting move in game ${gameId}:`, move);

    // Make sure the game has started
    if (!game.started) {
        console.error(`Cannot broadcast move: game ${gameId} has not started yet`);
        return;
    }

    // Add move to game history
    game.moves.push(move);

    // Toggle the current player after each move
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
server.on('connection', (ws, req) => {
    console.log('Client connected from:', req.socket.remoteAddress);
    let gameId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received message:', data);

            switch(data.type) {
                case 'create_game':
                    gameId = createGame(ws);
                    console.log(`Game ${gameId} created, waiting for second player`);
                    ws.send(JSON.stringify({
                        type: 'game_created',
                        gameId,
                        message: 'Game created, waiting for second player'
                    }));
                    console.log(`Game ${gameId} created successfully`);
                    break;

                case 'join_game':
                    if (games.has(data.gameId)) {
                        const game = games.get(data.gameId);

                        // Check if the game already has a second player
                        if (game.secondPlayer) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Game is full'
                            }));
                            return;
                        }

                        gameId = data.gameId;
                        game.secondPlayer = ws;
                        console.log(`Second player joined game ${gameId}`);

                        // Send confirmation to the joining player
                        ws.send(JSON.stringify({
                            type: 'game_joined',
                            gameId,
                            message: 'Joined game, assigning players...'
                        }));

                        // Start the game and assign player colors
                        startGame(gameId);
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

                        // Check if game has started
                        if (!game.started) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Game has not started yet'
                            }));
                            return;
                        }

                        // Check if it's this player's turn
                        const isWhitePlayer = ws === game.whitePlayer;
                        const isBlackPlayer = ws === game.blackPlayer;
                        const isWhiteTurn = game.currentPlayer === 'w';
                        const isBlackTurn = game.currentPlayer === 'b';

                        if ((isWhitePlayer && !isWhiteTurn) || (isBlackPlayer && !isBlackTurn)) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Not your turn'
                            }));
                            return;
                        }

                        // Make sure the player is either white or black
                        if (!isWhitePlayer && !isBlackPlayer) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'You are not a player in this game'
                            }));
                            return;
                        }

                        console.log(`Processing move from ${isWhitePlayer ? 'white' : 'black'} player in game ${gameId}`);

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

            // If game hasn't started yet, just clean up
            if (!game.started) {
                if (game.firstPlayer === ws) {
                    console.log(`First player disconnected from game ${gameId}, removing game`);
                    games.delete(gameId);
                } else if (game.secondPlayer === ws) {
                    console.log(`Second player disconnected from game ${gameId}, resetting second player`);
                    game.secondPlayer = null;
                }
                return;
            }

            // Game has started, notify the other player
            if (ws === game.whitePlayer && game.blackPlayer) {
                game.blackPlayer.send(JSON.stringify({
                    type: 'player_disconnected',
                    color: 'w'
                }));
                console.log(`White player disconnected from game ${gameId}, notified black player`);
            } else if (ws === game.blackPlayer && game.whitePlayer) {
                game.whitePlayer.send(JSON.stringify({
                    type: 'player_disconnected',
                    color: 'b'
                }));
                console.log(`Black player disconnected from game ${gameId}, notified white player`);
            }
        }
    });
});

// Start the HTTP server
const PORT = 8080;
httpServer.listen(PORT, () => {
    console.log(`Chess multiplayer server running on port ${PORT}`);
});
