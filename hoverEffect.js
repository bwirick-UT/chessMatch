// Hover effect for chess board squares

// Store the hover highlight element
let hoverHighlight = null;

// Create the hover highlight element
function createHoverHighlight() {
    // Check if the highlight already exists
    if (hoverHighlight) {
        return hoverHighlight;
    }
    
    // Create a new highlight element
    hoverHighlight = document.createElement('div');
    hoverHighlight.id = 'hover-highlight';
    
    // Style the highlight
    hoverHighlight.style.position = 'absolute';
    hoverHighlight.style.width = '60px';
    hoverHighlight.style.height = '60px';
    hoverHighlight.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    hoverHighlight.style.border = '2px solid rgba(255, 255, 255, 0.5)';
    hoverHighlight.style.borderRadius = '5px';
    hoverHighlight.style.pointerEvents = 'none'; // Allow clicks to pass through
    hoverHighlight.style.zIndex = '90'; // Below the move highlights
    hoverHighlight.style.display = 'none'; // Initially hidden
    
    // Add to the document
    document.body.appendChild(hoverHighlight);
    
    return hoverHighlight;
}

// Update the hover highlight position based on mouse position
function updateHoverPosition(event, canvas, eye, at, up, projectionMatrix) {
    // Ensure the hover highlight exists
    if (!hoverHighlight) {
        hoverHighlight = createHoverHighlight();
    }
    
    // Get mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert to board coordinates
    const boardPos = screenToBoard(x, y, canvas, eye, at, up, projectionMatrix);
    
    // If mouse is over the board, show and position the highlight
    if (boardPos) {
        const { row, col } = boardPos;
        
        // Calculate position in 3D space
        const boardX = col - 3.5;
        const boardY = 0.01; // Slightly above the board
        const boardZ = (7 - row) - 3.5; // Flip row to match our coordinate system
        
        // Project 3D position to screen coordinates
        const worldPos = vec4.fromValues(boardX, boardY, boardZ, 1.0);
        
        // Create view matrix
        const viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, eye, at, up);
        
        // Create combined view-projection matrix
        const viewProjectionMatrix = mat4.create();
        mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
        
        // Transform world position to clip space
        const clipPos = vec4.create();
        vec4.transformMat4(clipPos, worldPos, viewProjectionMatrix);
        
        // Perspective division to get NDC coordinates
        const ndcX = clipPos[0] / clipPos[3];
        const ndcY = clipPos[1] / clipPos[3];
        
        // Convert NDC to screen coordinates
        const screenX = (ndcX + 1) * 0.5 * canvas.width;
        const screenY = (1 - (ndcY + 1) * 0.5) * canvas.height;
        
        // Update highlight position
        hoverHighlight.style.left = `${screenX - 30}px`; // Center the highlight
        hoverHighlight.style.top = `${screenY - 30}px`;  // Center the highlight
        hoverHighlight.style.display = 'block';
        
        // Adjust size based on distance from camera
        const distance = vec3.distance(eye, [boardX, boardY, boardZ]);
        const scale = Math.max(0.5, Math.min(1.5, 10 / distance));
        hoverHighlight.style.transform = `scale(${scale})`;
    } else {
        // Hide the highlight if not over the board
        hoverHighlight.style.display = 'none';
    }
}

// Convert screen coordinates to board coordinates
function screenToBoard(x, y, canvas, eye, at, up, projectionMatrix) {
    // Normalize device coordinates
    const ndcX = (2.0 * x) / canvas.width - 1.0;
    const ndcY = 1.0 - (2.0 * y) / canvas.height;
    
    // Create ray in clip space
    const clipCoords = vec4.fromValues(ndcX, ndcY, -1.0, 1.0);
    
    // Convert to eye space
    const invProjectionMatrix = mat4.create();
    mat4.invert(invProjectionMatrix, projectionMatrix);
    const eyeCoords = vec4.create();
    vec4.transformMat4(eyeCoords, clipCoords, invProjectionMatrix);
    eyeCoords[2] = -1.0; // Forward direction
    eyeCoords[3] = 0.0;  // Direction vector
    
    // Convert to world space
    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, eye, at, up);
    const invViewMatrix = mat4.create();
    mat4.invert(invViewMatrix, viewMatrix);
    const worldCoords = vec4.create();
    vec4.transformMat4(worldCoords, eyeCoords, invViewMatrix);
    const rayDirection = vec3.fromValues(worldCoords[0], worldCoords[1], worldCoords[2]);
    vec3.normalize(rayDirection, rayDirection);
    
    // Ray-plane intersection (assuming board is on y=0 plane)
    const rayOrigin = eye;
    const planeNormal = vec3.fromValues(0, 1, 0);
    const planePoint = vec3.fromValues(0, 0, 0);
    
    const denominator = vec3.dot(planeNormal, rayDirection);
    if (Math.abs(denominator) > 0.0001) {
        const t = vec3.dot(vec3.sub(vec3.create(), planePoint, rayOrigin), planeNormal) / denominator;
        if (t >= 0) {
            // Calculate intersection point
            const intersection = vec3.create();
            vec3.scaleAndAdd(intersection, rayOrigin, rayDirection, t);
            
            // Convert to board coordinates (0-7, 0-7)
            const boardX = Math.floor(intersection[0] + 4);
            const boardZ = Math.floor(intersection[2] + 4);
            
            // Check if within board bounds
            if (boardX >= 0 && boardX < 8 && boardZ >= 0 && boardZ < 8) {
                // Flip the row coordinate to match standard chess notation
                return { row: 7 - boardZ, col: boardX };
            }
        }
    }
    
    return null;
}

// Hide the hover highlight
function hideHoverHighlight() {
    if (hoverHighlight) {
        hoverHighlight.style.display = 'none';
    }
}

export { createHoverHighlight, updateHoverPosition, hideHoverHighlight };
