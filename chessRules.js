const GAME_ONGOING = 'ongoing';
const GAME_CHECKMATE = 'checkmate';
const GAME_STALEMATE = 'stalemate';
const GAME_DRAW = 'draw';

class ChessRules {
    constructor() {
        this.gameState = GAME_ONGOING;
        this.currentPlayer = 'w';

        this.board = null;

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

    isValidMove(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];

        if (!piece) {
            return false;
        }

        const pieceColor = piece[0];
        if (pieceColor !== this.currentPlayer) {
            return false;
        }

        if (fromRow === toRow && fromCol === toCol) {
            return false;
        }

        const pieceType = piece[1];

        let isValid = false;

        switch (pieceType) {
            case 'p':
                isValid = this.isValidPawnMove(board, fromRow, fromCol, toRow, toCol);
                break;
            case 'r':
                isValid = this.isValidRookMove(board, fromRow, fromCol, toRow, toCol);
                break;
            case 'n':
                isValid = this.isValidKnightMove(board, fromRow, fromCol, toRow, toCol);
                break;
            case 'b':
                isValid = this.isValidBishopMove(board, fromRow, fromCol, toRow, toCol);
                break;
            case 'q':
                isValid = this.isValidQueenMove(board, fromRow, fromCol, toRow, toCol);
                break;
            case 'k':
                isValid = this.isValidKingMove(board, fromRow, fromCol, toRow, toCol);
                break;
        }

        if (isValid) {
            const tempBoard = this.cloneBoard(board);

            tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
            tempBoard[fromRow][fromCol] = null;

            if (pieceType === 'p' && fromCol !== toCol && board[toRow][toCol] === null) {
                tempBoard[fromRow][toCol] = null;
            }

            if (pieceType === 'k' && Math.abs(fromCol - toCol) === 2) {
                if (toCol > fromCol) {
                    tempBoard[fromRow][fromCol + 1] = tempBoard[fromRow][7];
                    tempBoard[fromRow][7] = null;
                }
                else {
                    tempBoard[fromRow][fromCol - 1] = tempBoard[fromRow][0];
                    tempBoard[fromRow][0] = null;
                }
            }

            if (this.isInCheck(tempBoard, pieceColor)) {
                return false;
            }

            return true;
        }

        return false;
    }

    cloneBoard(board) {
        return board.map(row => [...row]);
    }

    makeMove(board, fromRow, fromCol, toRow, toCol, updateGameState = true) {
        const piece = board[fromRow][fromCol];
        const pieceColor = piece[0];
        const pieceType = piece[1];
        const targetPiece = board[toRow][toCol];

        if (pieceType === 'k' && Math.abs(fromCol - toCol) === 2) {
            if (toCol > fromCol) {
                board[fromRow][fromCol + 1] = board[fromRow][7];
                board[fromRow][7] = null;
            }
            else {
                board[fromRow][fromCol - 1] = board[fromRow][0];
                board[fromRow][0] = null;
            }
        }

        if (pieceType === 'p' && toCol !== fromCol && !targetPiece) {
            board[fromRow][toCol] = null;
        }

        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = null;

        if (pieceType === 'k') {
            this.kingPositions[pieceColor] = { row: toRow, col: toCol };
        }

        if (pieceType === 'p' && (toRow === 0 || toRow === 7)) {
            board[toRow][toCol] = pieceColor + 'q';
        }

        if (updateGameState) {
            this.updateCastlingRights(piece, fromRow, fromCol);

            this.updateEnPassantTarget(piece, fromRow, fromCol, toRow, toCol);

            if (pieceType === 'p' || targetPiece) {
                this.halfMoveClock = 0;
            } else {
                this.halfMoveClock++;
            }

            if (pieceColor === 'b') {
                this.fullMoveNumber++;
            }

            this.currentPlayer = pieceColor === 'w' ? 'b' : 'w';

            this.updateGameState(board);
        }
    }

    updateCastlingRights(piece, fromRow, fromCol) {
        const pieceColor = piece[0];
        const pieceType = piece[1];

        if (pieceType === 'k') {
            this.castlingRights[pieceColor].kingSide = false;
            this.castlingRights[pieceColor].queenSide = false;
        }

        if (pieceType === 'r') {
            if (pieceColor === 'w') {
                if (fromRow === 0 && fromCol === 0) {
                    this.castlingRights.w.queenSide = false;
                } else if (fromRow === 0 && fromCol === 7) {
                    this.castlingRights.w.kingSide = false;
                }
            }
            else {
                if (fromRow === 7 && fromCol === 0) {
                    this.castlingRights.b.queenSide = false;
                } else if (fromRow === 7 && fromCol === 7) {
                    this.castlingRights.b.kingSide = false;
                }
            }
        }
    }

    updateEnPassantTarget(piece, fromRow, fromCol, toRow, toCol) {
        const pieceType = piece[1];

        this.enPassantTarget = null;

        if (pieceType === 'p' && Math.abs(fromRow - toRow) === 2) {
            const direction = fromRow < toRow ? 1 : -1;
            this.enPassantTarget = { row: fromRow + direction, col: toCol };
        }
    }

    updateGameState(board) {
        const isInCheck = this.isInCheck(board, this.currentPlayer);

        const hasLegalMoves = this.hasLegalMoves(board, this.currentPlayer);

        if (isInCheck && !hasLegalMoves) {
            this.gameState = GAME_CHECKMATE;
            console.log(`Checkmate! ${this.currentPlayer === 'w' ? 'Black' : 'White'} wins!`);
        } else if (!isInCheck && !hasLegalMoves) {
            this.gameState = GAME_STALEMATE;
            console.log('Stalemate! The game is a draw.');
        } else if (this.isDraw(board)) {
            this.gameState = GAME_DRAW;
            console.log('Draw! The game is a draw.');
        } else {
            this.gameState = GAME_ONGOING;
            if (isInCheck) {
                console.log(`${this.currentPlayer === 'w' ? 'White' : 'Black'} is in check!`);
            }
        }
    }

    isDraw(board) {
        if (this.halfMoveClock >= 100) {
            return true;
        }

        return this.hasInsufficientMaterial(board);
    }

    hasInsufficientMaterial(board) {
        let pieces = {
            w: { count: 0, bishops: [], knights: 0 },
            b: { count: 0, bishops: [], knights: 0 }
        };

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece) {
                    const color = piece[0];
                    const type = piece[1];

                    pieces[color].count++;

                    if (type === 'b') {
                        pieces[color].bishops.push((row + col) % 2);
                    } else if (type === 'n') {
                        pieces[color].knights++;
                    } else if (type !== 'k') {
                        return false;
                    }
                }
            }
        }

        if (pieces.w.count === 1 && pieces.b.count === 1) {
            return true;
        }

        if ((pieces.w.count === 1 && pieces.b.count === 2 && pieces.b.bishops.length === 1) ||
            (pieces.b.count === 1 && pieces.w.count === 2 && pieces.w.bishops.length === 1)) {
            return true;
        }

        if ((pieces.w.count === 1 && pieces.b.count === 2 && pieces.b.knights === 1) ||
            (pieces.b.count === 1 && pieces.w.count === 2 && pieces.w.knights === 1)) {
            return true;
        }

        if (pieces.w.count === 2 && pieces.b.count === 2 &&
            pieces.w.bishops.length === 1 && pieces.b.bishops.length === 1 &&
            pieces.w.bishops[0] === pieces.b.bishops[0]) {
            return true;
        }

        return false;
    }

    hasLegalMoves(board, color) {
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = board[fromRow][fromCol];
                if (piece && piece[0] === color) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            const savedCurrentPlayer = this.currentPlayer;
                            this.currentPlayer = color;

                            const isValid = this.isValidMove(board, fromRow, fromCol, toRow, toCol);

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

    isInCheck(board, color) {
        let kingPos = this.kingPositions[color];
        let kingFound = false;

        if (board[kingPos.row][kingPos.col] === color + 'k') {
            kingFound = true;
        } else {
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    if (board[row][col] === color + 'k') {
                        kingPos = { row, col };
                        this.kingPositions[color] = kingPos;
                        kingFound = true;
                        break;
                    }
                }
                if (kingFound) break;
            }
        }

        if (!kingFound) {
            console.error(`King not found for ${color} player!`);
            return false;
        }

        const opponentColor = color === 'w' ? 'b' : 'w';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece[0] === opponentColor) {
                    const savedCurrentPlayer = this.currentPlayer;
                    this.currentPlayer = opponentColor;

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

                    this.currentPlayer = savedCurrentPlayer;

                    if (canAttackKing) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    canPawnAttack(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        const pieceColor = piece[0];

        const direction = pieceColor === 'w' ? 1 : -1;

        return (toRow === fromRow + direction && Math.abs(toCol - fromCol) === 1);
    }

    canKingAttack(fromRow, fromCol, toRow, toCol) {
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);

        return rowDiff <= 1 && colDiff <= 1;
    }

    isValidPawnMove(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        const pieceColor = piece[0];
        const direction = pieceColor === 'w' ? 1 : -1;

        if (fromCol === toCol) {
            if (toRow === fromRow + direction) {
                return board[toRow][toCol] === null;
            }

            const startingRow = pieceColor === 'w' ? 1 : 6;
            if (fromRow === startingRow && toRow === fromRow + 2 * direction) {
                return board[fromRow + direction][fromCol] === null && board[toRow][toCol] === null;
            }
        }
        else if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction) {
            if (board[toRow][toCol] !== null && board[toRow][toCol][0] !== pieceColor) {
                return true;
            }

            if (board[toRow][toCol] === null && this.enPassantTarget &&
                this.enPassantTarget.row === toRow && this.enPassantTarget.col === toCol) {
                return true;
            }
        }

        return false;
    }

    isValidRookMove(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        const pieceColor = piece[0];

        if (fromRow !== toRow && fromCol !== toCol) {
            return false;
        }

        if (fromRow === toRow) {
            const start = Math.min(fromCol, toCol);
            const end = Math.max(fromCol, toCol);

            for (let col = start + 1; col < end; col++) {
                if (board[fromRow][col] !== null) {
                    return false;
                }
            }
        } else {
            const start = Math.min(fromRow, toRow);
            const end = Math.max(fromRow, toRow);

            for (let row = start + 1; row < end; row++) {
                if (board[row][fromCol] !== null) {
                    return false;
                }
            }
        }

        return board[toRow][toCol] === null || board[toRow][toCol][0] !== pieceColor;
    }

    isValidKnightMove(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        const pieceColor = piece[0];

        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);

        if ((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)) {
            return board[toRow][toCol] === null || board[toRow][toCol][0] !== pieceColor;
        }

        return false;
    }

    isValidBishopMove(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        const pieceColor = piece[0];

        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);

        if (rowDiff !== colDiff) {
            return false;
        }

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

        return board[toRow][toCol] === null || board[toRow][toCol][0] !== pieceColor;
    }

    isValidQueenMove(board, fromRow, fromCol, toRow, toCol) {
        return this.isValidRookMove(board, fromRow, fromCol, toRow, toCol) ||
               this.isValidBishopMove(board, fromRow, fromCol, toRow, toCol);
    }

    isValidKingMove(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        const pieceColor = piece[0];

        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);

        if (rowDiff <= 1 && colDiff <= 1) {
            return board[toRow][toCol] === null || board[toRow][toCol][0] !== pieceColor;
        }

        if (rowDiff === 0 && colDiff === 2) {
            if ((pieceColor === 'w' && fromRow !== 0) || (pieceColor === 'b' && fromRow !== 7)) {
                return false;
            }

            if (this.isInCheck(board, pieceColor)) {
                return false;
            }

            if (toCol > fromCol && this.castlingRights[pieceColor].kingSide) {
                if (board[fromRow][fromCol + 1] !== null || board[fromRow][fromCol + 2] !== null) {
                    return false;
                }

                if (board[fromRow][7] === null || board[fromRow][7] !== pieceColor + 'r') {
                    return false;
                }

                const tempBoard = this.cloneBoard(board);
                tempBoard[fromRow][fromCol + 1] = piece;
                tempBoard[fromRow][fromCol] = null;

                if (this.isInCheck(tempBoard, pieceColor)) {
                    return false;
                }

                return true;
            }

            if (toCol < fromCol && this.castlingRights[pieceColor].queenSide) {
                if (board[fromRow][fromCol - 1] !== null ||
                    board[fromRow][fromCol - 2] !== null ||
                    board[fromRow][fromCol - 3] !== null) {
                    return false;
                }

                if (board[fromRow][0] === null || board[fromRow][0] !== pieceColor + 'r') {
                    return false;
                }

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

    getGameState() {
        return {
            state: this.gameState,
            winner: this.gameState === GAME_CHECKMATE ? (this.currentPlayer === 'w' ? 'b' : 'w') : null,
            currentPlayer: this.currentPlayer
        };
    }

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
