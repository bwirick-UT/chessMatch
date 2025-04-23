// Chess rules implementation

// Game state constants
const GAME_ONGOING = 'ongoing';
const GAME_CHECKMATE = 'checkmate';
const GAME_STALEMATE = 'stalemate';
const GAME_DRAW = 'draw';

class ChessRules {
    constructor() {
        // Game state
        this.gameState = GAME_ONGOING;
        this.currentPlayer = 'w'; // 'w' for white, 'b' for black

        // Reference to the board (will be set when used)
        this.board = null;

        // Special move tracking
        this.castlingRights = {
            w: { kingSide: true, queenSide: true },
            b: { kingSide: true, queenSide: true }
        };
        this.enPassantTarget = null; // Square that can be captured via en passant
        this.halfMoveClock = 0; // For 50-move rule (increments after each move, reset after pawn move or capture)
        this.fullMoveNumber = 1; // Increments after black's move

        // King positions for quick check detection
        this.kingPositions = {
            w: { row: 0, col: 4 },
            b: { row: 7, col: 4 }
        };
    }

    // Check if a move is valid according to chess rules
    isValidMove(board, fromRow, fromCol, toRow, toCol) {
        console.log('isValidMove called for [' + fromRow + ',' + fromCol + '] to [' + toRow + ',' + toCol + ']');

        // Get the piece at the starting position
        const piece = board[fromRow][fromCol];
        console.log('Piece:', piece);

        // No piece at the starting position
        if (!piece) {
            console.log('No piece at starting position');
            return false;
        }

        // Check if it's the correct player's turn
        const pieceColor = piece[0];
        console.log('Piece color:', pieceColor, 'Current player:', this.currentPlayer);
        if (pieceColor !== this.currentPlayer) {
            console.log('Not current player\'s turn');
            return false;
        }

        // Check if the destination is the same as the starting position
        if (fromRow === toRow && fromCol === toCol) {
            return false;
        }

        // Get the piece type
        const pieceType = piece[1];

        // Check if the move is valid for the specific piece type
        let isValid = false;

        switch (pieceType) {
            case 'p': // Pawn
                isValid = this.isValidPawnMove(board, fromRow, fromCol, toRow, toCol);
                break;
            case 'r': // Rook
                isValid = this.isValidRookMove(board, fromRow, fromCol, toRow, toCol);
                break;
            case 'n': // Knight
                isValid = this.isValidKnightMove(board, fromRow, fromCol, toRow, toCol);
                break;
            case 'b': // Bishop
                isValid = this.isValidBishopMove(board, fromRow, fromCol, toRow, toCol);
                break;
            case 'q': // Queen
                isValid = this.isValidQueenMove(board, fromRow, fromCol, toRow, toCol);
                break;
            case 'k': // King
                isValid = this.isValidKingMove(board, fromRow, fromCol, toRow, toCol);
                break;
        }

        // If the move is valid according to piece movement rules
        if (isValid) {
            // Check if the move would leave the king in check
            const tempBoard = this.cloneBoard(board);

            // Properly simulate the move on the temporary board
            tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
            tempBoard[fromRow][fromCol] = null;

            // Special case for en passant capture
            if (pieceType === 'p' && fromCol !== toCol && board[toRow][toCol] === null) {
                // This is an en passant capture, remove the captured pawn
                tempBoard[fromRow][toCol] = null;
            }

            // Special case for castling
            if (pieceType === 'k' && Math.abs(fromCol - toCol) === 2) {
                // Kingside castling
                if (toCol > fromCol) {
                    tempBoard[fromRow][fromCol + 1] = tempBoard[fromRow][7];
                    tempBoard[fromRow][7] = null;
                }
                // Queenside castling
                else {
                    tempBoard[fromRow][fromCol - 1] = tempBoard[fromRow][0];
                    tempBoard[fromRow][0] = null;
                }
            }

            // If the move leaves the king in check, it's invalid
            if (this.isInCheck(tempBoard, pieceColor)) {
                return false;
            }

            return true;
        }

        return false;
    }

    // Clone the board for move validation
    cloneBoard(board) {
        return board.map(row => [...row]);
    }

    // Make a move on the board
    makeMove(board, fromRow, fromCol, toRow, toCol, updateGameState = true) {
        const piece = board[fromRow][fromCol];
        const pieceColor = piece[0];
        const pieceType = piece[1];
        const targetPiece = board[toRow][toCol];

        // Check for castling
        if (pieceType === 'k' && Math.abs(fromCol - toCol) === 2) {
            // Kingside castling
            if (toCol > fromCol) {
                board[fromRow][fromCol + 1] = board[fromRow][7]; // Move rook
                board[fromRow][7] = null; // Remove rook from original position
            }
            // Queenside castling
            else {
                board[fromRow][fromCol - 1] = board[fromRow][0]; // Move rook
                board[fromRow][0] = null; // Remove rook from original position
            }
        }

        // Check for en passant capture
        if (pieceType === 'p' && toCol !== fromCol && !targetPiece) {
            // En passant capture
            board[fromRow][toCol] = null; // Remove the captured pawn
        }

        // Move the piece
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = null;

        // Update king position if king moved
        if (pieceType === 'k') {
            this.kingPositions[pieceColor] = { row: toRow, col: toCol };
        }

        // Check for pawn promotion (simplified - always promotes to queen)
        if (pieceType === 'p' && (toRow === 0 || toRow === 7)) {
            board[toRow][toCol] = pieceColor + 'q'; // Promote to queen
        }

        if (updateGameState) {
            // Update castling rights
            this.updateCastlingRights(piece, fromRow, fromCol);

            // Update en passant target
            this.updateEnPassantTarget(piece, fromRow, fromCol, toRow, toCol);

            // Update half move clock for 50-move rule
            if (pieceType === 'p' || targetPiece) {
                this.halfMoveClock = 0;
            } else {
                this.halfMoveClock++;
            }

            // Update full move number
            if (pieceColor === 'b') {
                this.fullMoveNumber++;
            }

            // Switch player
            this.currentPlayer = pieceColor === 'w' ? 'b' : 'w';

            // Check game state (checkmate, stalemate, etc.)
            this.updateGameState(board);
        }
    }

    // Update castling rights when a king or rook moves
    updateCastlingRights(piece, fromRow, fromCol) {
        const pieceColor = piece[0];
        const pieceType = piece[1];

        // If king moves, lose all castling rights for that color
        if (pieceType === 'k') {
            this.castlingRights[pieceColor].kingSide = false;
            this.castlingRights[pieceColor].queenSide = false;
        }

        // If rook moves, lose castling rights for that side
        if (pieceType === 'r') {
            // White rooks
            if (pieceColor === 'w') {
                if (fromRow === 0 && fromCol === 0) {
                    this.castlingRights.w.queenSide = false;
                } else if (fromRow === 0 && fromCol === 7) {
                    this.castlingRights.w.kingSide = false;
                }
            }
            // Black rooks
            else {
                if (fromRow === 7 && fromCol === 0) {
                    this.castlingRights.b.queenSide = false;
                } else if (fromRow === 7 && fromCol === 7) {
                    this.castlingRights.b.kingSide = false;
                }
            }
        }
    }

    // Update en passant target square
    updateEnPassantTarget(piece, fromRow, fromCol, toRow, toCol) {
        const pieceType = piece[1];

        // Reset en passant target
        this.enPassantTarget = null;

        // If a pawn moves two squares, set en passant target
        if (pieceType === 'p' && Math.abs(fromRow - toRow) === 2) {
            const direction = fromRow < toRow ? 1 : -1;
            this.enPassantTarget = { row: fromRow + direction, col: toCol };
        }
    }

    // Update game state (check for checkmate, stalemate, etc.)
    updateGameState(board) {
        // Check if the current player is in check
        const isInCheck = this.isInCheck(board, this.currentPlayer);

        // Check if the current player has any legal moves
        const hasLegalMoves = this.hasLegalMoves(board, this.currentPlayer);

        if (isInCheck && !hasLegalMoves) {
            // Checkmate
            this.gameState = GAME_CHECKMATE;
            console.log(`Checkmate! ${this.currentPlayer === 'w' ? 'Black' : 'White'} wins!`);
        } else if (!isInCheck && !hasLegalMoves) {
            // Stalemate
            this.gameState = GAME_STALEMATE;
            console.log('Stalemate! The game is a draw.');
        } else if (this.isDraw(board)) {
            // Draw by insufficient material, 50-move rule, or threefold repetition
            this.gameState = GAME_DRAW;
            console.log('Draw! The game is a draw.');
        } else {
            this.gameState = GAME_ONGOING;
            if (isInCheck) {
                console.log(`${this.currentPlayer === 'w' ? 'White' : 'Black'} is in check!`);
            }
        }
    }

    // Check if the game is a draw
    isDraw(board) {
        // 50-move rule
        if (this.halfMoveClock >= 100) { // 50 moves = 100 half-moves
            return true;
        }

        // Insufficient material (simplified)
        return this.hasInsufficientMaterial(board);
    }

    // Check if there is insufficient material for checkmate
    hasInsufficientMaterial(board) {
        let pieces = {
            w: { count: 0, bishops: [], knights: 0 },
            b: { count: 0, bishops: [], knights: 0 }
        };

        // Count pieces
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece) {
                    const color = piece[0];
                    const type = piece[1];

                    pieces[color].count++;

                    if (type === 'b') {
                        pieces[color].bishops.push((row + col) % 2); // 0 for light square, 1 for dark square
                    } else if (type === 'n') {
                        pieces[color].knights++;
                    } else if (type !== 'k') {
                        // If there's a queen, rook, or pawn, there's sufficient material
                        return false;
                    }
                }
            }
        }

        // King vs King
        if (pieces.w.count === 1 && pieces.b.count === 1) {
            return true;
        }

        // King + Bishop vs King
        if ((pieces.w.count === 1 && pieces.b.count === 2 && pieces.b.bishops.length === 1) ||
            (pieces.b.count === 1 && pieces.w.count === 2 && pieces.w.bishops.length === 1)) {
            return true;
        }

        // King + Knight vs King
        if ((pieces.w.count === 1 && pieces.b.count === 2 && pieces.b.knights === 1) ||
            (pieces.b.count === 1 && pieces.w.count === 2 && pieces.w.knights === 1)) {
            return true;
        }

        // King + Bishop vs King + Bishop (same color bishops)
        if (pieces.w.count === 2 && pieces.b.count === 2 &&
            pieces.w.bishops.length === 1 && pieces.b.bishops.length === 1 &&
            pieces.w.bishops[0] === pieces.b.bishops[0]) {
            return true;
        }

        return false;
    }

    // Check if a player has any legal moves
    hasLegalMoves(board, color) {
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = board[fromRow][fromCol];
                if (piece && piece[0] === color) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            // Save current state
                            const savedCurrentPlayer = this.currentPlayer;
                            this.currentPlayer = color;

                            // Check if move is valid
                            const isValid = this.isValidMove(board, fromRow, fromCol, toRow, toCol);

                            // Restore state
                            this.currentPlayer = savedCurrentPlayer;

                            if (isValid) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    // Check if a king is in check
    isInCheck(board, color) {
        // Find the king's position (in case it moved)
        let kingPos = this.kingPositions[color];
        let kingFound = false;

        // Verify king position or find it if it moved
        if (board[kingPos.row][kingPos.col] === color + 'k') {
            kingFound = true;
        } else {
            // King has moved, find it
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    if (board[row][col] === color + 'k') {
                        kingPos = { row, col };
                        this.kingPositions[color] = kingPos; // Update king position
                        kingFound = true;
                        break;
                    }
                }
                if (kingFound) break;
            }
        }

        // If king not found (shouldn't happen in a valid game), return false
        if (!kingFound) {
            console.error(`King not found for ${color} player!`);
            return false;
        }

        const opponentColor = color === 'w' ? 'b' : 'w';

        // Check if any opponent piece can capture the king
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece[0] === opponentColor) {
                    // Check if this piece can move to the king's position
                    // We need to temporarily change the current player to check this
                    const savedCurrentPlayer = this.currentPlayer;
                    this.currentPlayer = opponentColor;

                    // Use piece-specific move validation without the check validation
                    // to avoid infinite recursion
                    let canAttackKing = false;
                    const pieceType = piece[1];

                    switch (pieceType) {
                        case 'p':
                            canAttackKing = this.canPawnAttack(board, row, col, kingPos.row, kingPos.col);
                            break;
                        case 'r':
                            canAttackKing = this.isValidRookMove(board, row, col, kingPos.row, kingPos.col);
                            break;
                        case 'n':
                            canAttackKing = this.isValidKnightMove(board, row, col, kingPos.row, kingPos.col);
                            break;
                        case 'b':
                            canAttackKing = this.isValidBishopMove(board, row, col, kingPos.row, kingPos.col);
                            break;
                        case 'q':
                            canAttackKing = this.isValidQueenMove(board, row, col, kingPos.row, kingPos.col);
                            break;
                        case 'k':
                            canAttackKing = this.canKingAttack(row, col, kingPos.row, kingPos.col);
                            break;
                    }

                    // Restore the current player
                    this.currentPlayer = savedCurrentPlayer;

                    if (canAttackKing) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // Check if a pawn can attack a specific square
    canPawnAttack(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        const pieceColor = piece[0];

        // Pawns can only capture diagonally
        const direction = pieceColor === 'w' ? 1 : -1;

        // Check if the target is one square diagonally forward
        return (toRow === fromRow + direction && Math.abs(toCol - fromCol) === 1);
    }

    // Check if a king can attack a specific square
    canKingAttack(fromRow, fromCol, toRow, toCol) {
        // Kings can move one square in any direction
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);

        return rowDiff <= 1 && colDiff <= 1;
    }

    // Validate pawn moves
    isValidPawnMove(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        const pieceColor = piece[0];
        const direction = pieceColor === 'w' ? 1 : -1;

        // Forward movement
        if (fromCol === toCol) {
            // One square forward
            if (toRow === fromRow + direction) {
                return board[toRow][toCol] === null;
            }

            // Two squares forward from starting position
            const startingRow = pieceColor === 'w' ? 1 : 6;
            if (fromRow === startingRow && toRow === fromRow + 2 * direction) {
                return board[fromRow + direction][fromCol] === null && board[toRow][toCol] === null;
            }
        }
        // Diagonal capture
        else if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction) {
            // Regular capture
            if (board[toRow][toCol] !== null && board[toRow][toCol][0] !== pieceColor) {
                return true;
            }

            // En passant capture
            if (board[toRow][toCol] === null && this.enPassantTarget &&
                this.enPassantTarget.row === toRow && this.enPassantTarget.col === toCol) {
                return true;
            }
        }

        return false;
    }

    // Validate rook moves
    isValidRookMove(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        const pieceColor = piece[0];

        // Rooks can only move horizontally or vertically
        if (fromRow !== toRow && fromCol !== toCol) {
            return false;
        }

        // Check if the path is clear
        if (fromRow === toRow) {
            // Horizontal movement
            const start = Math.min(fromCol, toCol);
            const end = Math.max(fromCol, toCol);

            for (let col = start + 1; col < end; col++) {
                if (board[fromRow][col] !== null) {
                    return false;
                }
            }
        } else {
            // Vertical movement
            const start = Math.min(fromRow, toRow);
            const end = Math.max(fromRow, toRow);

            for (let row = start + 1; row < end; row++) {
                if (board[row][fromCol] !== null) {
                    return false;
                }
            }
        }

        // Check if the destination square is empty or contains an opponent's piece
        return board[toRow][toCol] === null || board[toRow][toCol][0] !== pieceColor;
    }

    // Validate knight moves
    isValidKnightMove(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        const pieceColor = piece[0];

        // Knights move in an L-shape: 2 squares in one direction and 1 square perpendicular
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);

        if ((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)) {
            // Check if the destination square is empty or contains an opponent's piece
            return board[toRow][toCol] === null || board[toRow][toCol][0] !== pieceColor;
        }

        return false;
    }

    // Validate bishop moves
    isValidBishopMove(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        const pieceColor = piece[0];

        // Bishops can only move diagonally
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);

        if (rowDiff !== colDiff) {
            return false;
        }

        // Check if the path is clear
        const rowDirection = toRow > fromRow ? 1 : -1;
        const colDirection = toCol > fromCol ? 1 : -1;

        let row = fromRow + rowDirection;
        let col = fromCol + colDirection;

        while (row !== toRow && col !== toCol) {
            if (board[row][col] !== null) {
                return false;
            }
            row += rowDirection;
            col += colDirection;
        }

        // Check if the destination square is empty or contains an opponent's piece
        return board[toRow][toCol] === null || board[toRow][toCol][0] !== pieceColor;
    }

    // Validate queen moves
    isValidQueenMove(board, fromRow, fromCol, toRow, toCol) {
        // Queens can move like rooks or bishops
        return this.isValidRookMove(board, fromRow, fromCol, toRow, toCol) ||
               this.isValidBishopMove(board, fromRow, fromCol, toRow, toCol);
    }

    // Validate king moves
    isValidKingMove(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        const pieceColor = piece[0];

        // Regular king move (one square in any direction)
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);

        if (rowDiff <= 1 && colDiff <= 1) {
            // Check if the destination square is empty or contains an opponent's piece
            return board[toRow][toCol] === null || board[toRow][toCol][0] !== pieceColor;
        }

        // Castling
        if (rowDiff === 0 && colDiff === 2) {
            // Check if the king is in the correct starting position
            if ((pieceColor === 'w' && fromRow !== 0) || (pieceColor === 'b' && fromRow !== 7)) {
                return false;
            }

            // Check if the king is in check
            if (this.isInCheck(board, pieceColor)) {
                return false;
            }

            // Kingside castling
            if (toCol > fromCol && this.castlingRights[pieceColor].kingSide) {
                // Check if the path is clear
                if (board[fromRow][fromCol + 1] !== null || board[fromRow][fromCol + 2] !== null) {
                    return false;
                }

                // Check if the rook is in the correct position
                if (board[fromRow][7] === null || board[fromRow][7] !== pieceColor + 'r') {
                    return false;
                }

                // Check if the king passes through check
                const tempBoard = this.cloneBoard(board);
                tempBoard[fromRow][fromCol + 1] = piece;
                tempBoard[fromRow][fromCol] = null;

                if (this.isInCheck(tempBoard, pieceColor)) {
                    return false;
                }

                return true;
            }

            // Queenside castling
            if (toCol < fromCol && this.castlingRights[pieceColor].queenSide) {
                // Check if the path is clear
                if (board[fromRow][fromCol - 1] !== null ||
                    board[fromRow][fromCol - 2] !== null ||
                    board[fromRow][fromCol - 3] !== null) {
                    return false;
                }

                // Check if the rook is in the correct position
                if (board[fromRow][0] === null || board[fromRow][0] !== pieceColor + 'r') {
                    return false;
                }

                // Check if the king passes through check
                const tempBoard = this.cloneBoard(board);
                tempBoard[fromRow][fromCol - 1] = piece;
                tempBoard[fromRow][fromCol] = null;

                if (this.isInCheck(tempBoard, pieceColor)) {
                    return false;
                }

                return true;
            }
        }

        return false;
    }

    // Get the current game state
    getGameState() {
        return {
            state: this.gameState,
            winner: this.gameState === GAME_CHECKMATE ? (this.currentPlayer === 'w' ? 'b' : 'w') : null,
            currentPlayer: this.currentPlayer
        };
    }

    // Reset the game
    resetGame() {
        this.gameState = GAME_ONGOING;
        this.currentPlayer = 'w';
        this.castlingRights = {
            w: { kingSide: true, queenSide: true },
            b: { kingSide: true, queenSide: true }
        };
        this.enPassantTarget = null;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.kingPositions = {
            w: { row: 0, col: 4 },
            b: { row: 7, col: 4 }
        };
    }
}

export { ChessRules, GAME_ONGOING, GAME_CHECKMATE, GAME_STALEMATE, GAME_DRAW };
