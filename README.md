# 3D Chess Game

A fully interactive 3D chess game built with WebGL and JavaScript.

## About

This project is a complete chess implementation featuring 3D graphics, piece animations, and standard chess rules. The game renders a beautiful 3D chessboard with marble pieces and provides an intuitive interface for moving pieces according to standard chess rules.

## Technologies Used

- WebGL for 3D rendering
- JavaScript (ES6+)
- HTML5/CSS3
- gl-matrix for matrix operations

## Features

- Complete chess rules implementation including:
  - All standard piece movements
  - Check and checkmate detection
  - Stalemate and draw conditions
- 3D graphics with:
  - Textured chess pieces and board
  - Lighting and shading
  - Camera controls
- Interactive gameplay:
  - Highlighted valid moves
  - Piece animations
  - "Haunted" piece that follows your mouse
  - Automatic camera rotation between turns
  - Game state notifications

## How to Play

1. Open `index.html` in a modern web browser
2. White pieces move first, followed by black
3. Click on a piece to select it and see valid moves
4. Click on a highlighted square to move the selected piece
5. The game automatically detects check, checkmate, and draws

## Controls

### Game Controls
- **Select Piece:** Left-click on a piece
- **Move Piece:** Left-click on a highlighted square
- **Cancel Selection:** Click on a different piece or press ESC

### Camera Controls
- **Orbit Camera:** Right-click + drag
- **Zoom:** Mouse wheel

### Other Controls
- **H:** Toggle controls panel
- **New Game Button:** Appears after game ends

## Installation

No installation required. Simply download the repository and open `index.html` in a web browser.

## License

MIT License

Copyright (c) 2025 Brycen Wirick

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
