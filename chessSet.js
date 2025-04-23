import { setShaderAttributes, loadTexture } from "./helpers.js";
import { PieceAnimations } from "./pieceAnimations.js";

class ChessSet {
    constructor(gl) {
        this.resetBoard();

        this.animations = new PieceAnimations();

        this.capturedPieces = [];

        this.movingPieces = [];
    }

    resetBoard() {
        this.board = [
            ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr'],
            ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
            ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br']
        ];
    }

    async init(gl) {
        this.blackTexture = loadTexture(gl, 'pieces/PiezasAjedrezDiffuseMarmolBlackBrighter.png', [80, 80, 80, 255]);
        this.whiteTexture = loadTexture(gl, 'pieces/PiezasAjedrezDiffuseMarmol.png', [220, 220, 220, 255]);
        this.boardTexture = loadTexture(gl, 'pieces/TableroDiffuse01.png', [255, 171, 0, 255]);
        this.buffers = {};
        await readObj(gl, "pieces/PiezasAjedrezAdjusted.obj", this.buffers);
    }

    getPieceModel(piece) {
        if (!piece) return null;

        const pieceType = piece[1];
        switch (pieceType) {
            case 'p': return 'pawn';
            case 'r': return 'rook';
            case 'n': return 'knight';
            case 'b': return 'bishop';
            case 'q': return 'queen';
            case 'k': return 'king';
            default: return null;
        }
    }

    draw(gl, shaderProgram, currentTime) {
        gl.bindTexture(gl.TEXTURE_2D, this.boardTexture);

        const boardMatrix = mat4.create();
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelViewMatrix"), false, boardMatrix);

        const normalMatrix = mat3.create();
        mat3.normalFromMat4(normalMatrix, boardMatrix);
        gl.uniformMatrix3fv(gl.getUniformLocation(shaderProgram, "uNormalMatrix"), false, normalMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers["cube"]);
        setShaderAttributes(gl, shaderProgram);
        gl.drawArrays(gl.TRIANGLES, 0, this.buffers["cube"].vertexCount);

        const drawnPieces = new Set();

        for (const movingPiece of this.movingPieces) {
            this.drawAnimatedPiece(gl, shaderProgram, movingPiece, currentTime);

            const key = `${movingPiece.toRow},${movingPiece.toCol}`;
            drawnPieces.add(key);
        }

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const key = `${row},${col}`;
                if (drawnPieces.has(key)) continue;

                const piece = this.board[row][col];
                if (piece) {
                    this.drawPiece(gl, shaderProgram, piece, row, col, currentTime);
                }
            }
        }

        for (const capturedPiece of this.capturedPieces) {
            if (this.animations.isAnimating(capturedPiece.row, capturedPiece.col, currentTime)) {
                this.drawPiece(gl, shaderProgram, capturedPiece.piece, capturedPiece.row, capturedPiece.col, currentTime);
            }
        }

        this.cleanupCapturedPieces(currentTime);
        this.cleanupMovingPieces(currentTime);
    }

    drawPiece(gl, shaderProgram, piece, row, col, currentTime) {
        const pieceModel = this.getPieceModel(piece);
        if (pieceModel && this.buffers[pieceModel]) {
            const isWhite = piece[0] === 'w';
            gl.bindTexture(gl.TEXTURE_2D, isWhite ? this.whiteTexture : this.blackTexture);

            const x = col - 3.5;
            const y = 0;
            const z = (7 - row) - 3.5;
            const scale = .8;

            const modelViewMatrix = mat4.create();
            mat4.translate(modelViewMatrix, modelViewMatrix, [x, y, z]);

            let isAnimated = this.animations.applyAnimations(modelViewMatrix, row, col, currentTime);

            let isHaunted = false;
            if (!isAnimated && window.hauntedPiece) {
                isHaunted = window.hauntedPiece.applyRotation(modelViewMatrix, row, col);
            }

            if (isWhite && !isHaunted && !isAnimated) {
                mat4.rotateY(modelViewMatrix, modelViewMatrix, Math.PI);
            }

            mat4.scale(modelViewMatrix, modelViewMatrix, [scale, scale, scale]);
            gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelViewMatrix"), false, modelViewMatrix);

            const pieceNormalMatrix = mat3.create();
            mat3.normalFromMat4(pieceNormalMatrix, modelViewMatrix);
            gl.uniformMatrix3fv(gl.getUniformLocation(shaderProgram, "uNormalMatrix"), false, pieceNormalMatrix);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[pieceModel]);
            setShaderAttributes(gl, shaderProgram);
            gl.drawArrays(gl.TRIANGLES, 0, this.buffers[pieceModel].vertexCount);
        }
    }

    drawAnimatedPiece(gl, shaderProgram, movingPiece, currentTime) {
        const { piece, fromRow, fromCol, toRow, toCol, animationEndTime } = movingPiece;
        const pieceModel = this.getPieceModel(piece);

        if (pieceModel && this.buffers[pieceModel]) {
            const isWhite = piece[0] === 'w';
            gl.bindTexture(gl.TEXTURE_2D, isWhite ? this.whiteTexture : this.blackTexture);

            const startX = fromCol - 3.5;
            const startZ = (7 - fromRow) - 3.5;
            const endX = toCol - 3.5;
            const endZ = (7 - toRow) - 3.5;

            const progress = (currentTime - (animationEndTime - this.animations.MOVE_DURATION)) / this.animations.MOVE_DURATION;
            const clampedProgress = Math.min(1.0, Math.max(0.0, progress));

            const x = startX + (endX - startX) * clampedProgress;
            const z = startZ + (endZ - startZ) * clampedProgress;

            const y = this.animations.MOVE_HEIGHT * Math.sin(clampedProgress * Math.PI);

            const scale = .8;

            const modelViewMatrix = mat4.create();
            mat4.translate(modelViewMatrix, modelViewMatrix, [x, y, z]);

            const rotationAngle = Math.sin(clampedProgress * Math.PI * 2) * 0.1;
            mat4.rotateY(modelViewMatrix, modelViewMatrix, rotationAngle);

            if (isWhite) {
                mat4.rotateY(modelViewMatrix, modelViewMatrix, Math.PI);
            }

            mat4.scale(modelViewMatrix, modelViewMatrix, [scale, scale, scale]);
            gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelViewMatrix"), false, modelViewMatrix);

            const pieceNormalMatrix = mat3.create();
            mat3.normalFromMat4(pieceNormalMatrix, modelViewMatrix);
            gl.uniformMatrix3fv(gl.getUniformLocation(shaderProgram, "uNormalMatrix"), false, pieceNormalMatrix);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[pieceModel]);
            setShaderAttributes(gl, shaderProgram);
            gl.drawArrays(gl.TRIANGLES, 0, this.buffers[pieceModel].vertexCount);
        }
    }

    addCapturedPiece(piece, row, col, currentTime) {
        this.capturedPieces.push({
            piece,
            row,
            col,
            animationEndTime: currentTime + this.animations.addDeathAnimation(row, col, currentTime)
        });
    }

    cleanupCapturedPieces(currentTime) {
        this.capturedPieces = this.capturedPieces.filter(piece =>
            currentTime <= piece.animationEndTime
        );
    }

    animateAttack(fromRow, fromCol, toRow, toCol, currentTime) {
        return this.animations.addAttackAnimation(fromRow, fromCol, toRow, toCol, currentTime);
    }

    animateMove(fromRow, fromCol, toRow, toCol, currentTime) {
        const piece = this.board[fromRow][fromCol];

        this.movingPieces.push({
            piece,
            fromRow,
            fromCol,
            toRow,
            toCol,
            animationEndTime: currentTime + this.animations.MOVE_DURATION
        });

        return this.animations.addMoveAnimation(fromRow, fromCol, toRow, toCol, currentTime);
    }

    cleanupMovingPieces(currentTime) {
        this.movingPieces = this.movingPieces.filter(piece =>
            currentTime <= piece.animationEndTime
        );
    }

    hasRunningAnimations(currentTime) {
        return this.animations.hasRunningAnimations(currentTime);
    }
}

async function readObj(gl, filename, buffers) {
    const response = await fetch(filename);
    const text = await response.text()

    const lines = text.split("\n");
    let objectName = "";
    const vertexList = [];
    const normalList = [];
    const uvList = [];
    let currentFaceList = [];

    for (const line of lines) {
        const values = line.split(' ');
        if (values[0] == 'o') {
            if (currentFaceList.length > 0) {
                AddVertexBufferObject(gl, buffers, objectName, vertexList, uvList, normalList, currentFaceList)
                currentFaceList = []
            }
            objectName = values[1];
        }
        else if (values[0] == 'v') {
            vertexList.push(parseFloat(values[1]), parseFloat(values[2]), parseFloat(values[3]))
        }
        else if (values[0] == 'vn') {
            normalList.push(parseFloat(values[1]), parseFloat(values[2]), parseFloat(values[3]))
        }
        else if (values[0] == 'vt') {
            uvList.push(parseFloat(values[1]), 1 - parseFloat(values[2]))
        }
        else if (values[0] == 'f') {
            const numVerts = values.length - 1;
            const fieldsV0 = values[1].split('/');
            for (let i = 2; i < numVerts; i++) {
                const fieldsV1 = values[i].split('/');
                const fieldsV2 = values[i + 1].split('/');
                currentFaceList.push(parseInt(fieldsV0[0]) - 1, parseInt(fieldsV0[1]) - 1, parseInt(fieldsV0[2]) - 1);
                currentFaceList.push(parseInt(fieldsV1[0]) - 1, parseInt(fieldsV1[1]) - 1, parseInt(fieldsV1[2]) - 1);
                currentFaceList.push(parseInt(fieldsV2[0]) - 1, parseInt(fieldsV2[1]) - 1, parseInt(fieldsV2[2]) - 1);
            }
        }
    }
    if (currentFaceList.length > 0) {
        AddVertexBufferObject(gl, buffers, objectName, vertexList, uvList, normalList, currentFaceList)
    }
}


function AddVertexBufferObject(gl, buffers, objectName, vertexList, uvList, normalList, currentFaceList) {
    const vertices = [];
    for (let i = 0; i < currentFaceList.length; i += 3) {
        const vertexIndex = currentFaceList[i] * 3;
        const uvIndex = currentFaceList[i + 1] * 2;
        const normalIndex = currentFaceList[i + 2] * 3;
        vertices.push(vertexList[vertexIndex + 0], vertexList[vertexIndex + 1], vertexList[vertexIndex + 2],
            uvList[uvIndex + 0], uvList[uvIndex + 1],
            normalList[normalIndex + 0], normalList[normalIndex + 1], normalList[normalIndex + 2]
        );
    }

    const vertexBufferObject = gl.createBuffer();
    vertexBufferObject.vertexCount = vertices.length / 8;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    buffers[objectName] = vertexBufferObject;
}

export { ChessSet };