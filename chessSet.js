import { setShaderAttributes, loadTexture } from "./helpers.js";

class ChessSet {
    constructor(gl) {
        // Initialize the chess board state
        this.resetBoard();
    }

    // Reset the board to the initial state
    resetBoard() {
        // Note: In our coordinate system, row 0 is the bottom row (white's side)
        this.board = [
            ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr'], // Row 0 (white's back rank)
            ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'], // Row 1 (white's pawns)
            [null, null, null, null, null, null, null, null],   // Row 2
            [null, null, null, null, null, null, null, null],   // Row 3
            [null, null, null, null, null, null, null, null],   // Row 4
            [null, null, null, null, null, null, null, null],   // Row 5
            ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'], // Row 6 (black's pawns)
            ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br']  // Row 7 (black's back rank)
        ];
    }

    async init(gl) {
        this.blackTexture = loadTexture(gl, 'pieces/PiezasAjedrezDiffuseMarmolBlackBrighter.png', [80, 80, 80, 255]);
        this.whiteTexture = loadTexture(gl, 'pieces/PiezasAjedrezDiffuseMarmol.png', [220, 220, 220, 255]);
        this.boardTexture = loadTexture(gl, 'pieces/TableroDiffuse01.png', [255, 171, 0, 255]);
        this.buffers = {};
        await readObj(gl, "pieces/PiezasAjedrezAdjusted.obj", this.buffers);
    }

    // Get the 3D model name for a chess piece
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
        // Draw the board
        gl.bindTexture(gl.TEXTURE_2D, this.boardTexture);

        const boardMatrix = mat4.create();
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelViewMatrix"), false, boardMatrix);

        const normalMatrix = mat3.create();
        mat3.normalFromMat4(normalMatrix, boardMatrix);
        gl.uniformMatrix3fv(gl.getUniformLocation(shaderProgram, "uNormalMatrix"), false, normalMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers["cube"]);
        setShaderAttributes(gl, shaderProgram);
        gl.drawArrays(gl.TRIANGLES, 0, this.buffers["cube"].vertexCount);

        // Draw all chess pieces
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    const pieceModel = this.getPieceModel(piece);
                    if (pieceModel && this.buffers[pieceModel]) {
                        // Set the appropriate texture based on piece color
                        const isWhite = piece[0] === 'w';
                        gl.bindTexture(gl.TEXTURE_2D, isWhite ? this.whiteTexture : this.blackTexture);

                        // Calculate position on the board
                        const x = col - 3.5;  // Center the board
                        const y = 0;        // Slightly above the board surface
                        const z = (7 - row) - 3.5;  // Center the board and flip rows to match our coordinate system
                        const scale = .8;    // Scale the pieces appropriately

                        // Apply transformations
                        const modelViewMatrix = mat4.create();
                        mat4.translate(modelViewMatrix, modelViewMatrix, [x, y, z]);

                        // Check if this is the haunted piece and apply rotation if it is
                        let isHaunted = false;
                        if (window.hauntedPiece) {
                            isHaunted = window.hauntedPiece.applyRotation(modelViewMatrix, row, col);
                        }

                        // Rotate white pieces 180 degrees around Y axis to face black pieces
                        // Only if it's not the haunted piece (which is already rotated)
                        if (isWhite && !isHaunted) {
                            mat4.rotateY(modelViewMatrix, modelViewMatrix, Math.PI);
                        }

                        mat4.scale(modelViewMatrix, modelViewMatrix, [scale, scale, scale]);
                        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelViewMatrix"), false, modelViewMatrix);

                        const pieceNormalMatrix = mat3.create();
                        mat3.normalFromMat4(pieceNormalMatrix, modelViewMatrix);
                        gl.uniformMatrix3fv(gl.getUniformLocation(shaderProgram, "uNormalMatrix"), false, pieceNormalMatrix);

                        // Draw the piece
                        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[pieceModel]);
                        setShaderAttributes(gl, shaderProgram);
                        gl.drawArrays(gl.TRIANGLES, 0, this.buffers[pieceModel].vertexCount);
                    }
                }
            }
        }
    }
}

// filename to dictionary this.buffers
async function readObj(gl, filename, buffers) {
    const response = await fetch(filename);
    const text = await response.text()

    //    const output = {};
    const lines = text.split("\n");
    let objectName = "";
    const vertexList = [];
    const normalList = [];
    const uvList = [];
    let currentFaceList = [];
    //    output.objectList = {};

    for (const line of lines) {
        const values = line.split(' ');
        if (values[0] == 'o') {
            if (currentFaceList.length > 0) {
                //output.objectList[objectName] = currentFaceList
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
        //output.objectList[objectName] = currentFaceList
        AddVertexBufferObject(gl, buffers, objectName, vertexList, uvList, normalList, currentFaceList)
    }
    //    output.vertexList = vertexList;
    //    output.normalList = normalList;
    //    output.uvList = uvList;
    //    return output;
}


function AddVertexBufferObject(gl, buffers, objectName, vertexList, uvList, normalList, currentFaceList) {
    const vertices = [];
    for (let i = 0; i < currentFaceList.length; i += 3) {
        const vertexIndex = currentFaceList[i] * 3;
        const uvIndex = currentFaceList[i + 1] * 2;
        const normalIndex = currentFaceList[i + 2] * 3;
        vertices.push(vertexList[vertexIndex + 0], vertexList[vertexIndex + 1], vertexList[vertexIndex + 2], // x,y,x
            uvList[uvIndex + 0], uvList[uvIndex + 1], // u,v
            normalList[normalIndex + 0], normalList[normalIndex + 1], normalList[normalIndex + 2] // nx,ny,nz
        );
    }

    const vertexBufferObject = gl.createBuffer();
    vertexBufferObject.vertexCount = vertices.length / 8;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    buffers[objectName] = vertexBufferObject;
}

export { ChessSet };