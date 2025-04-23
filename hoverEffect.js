let hoverHighlight = null;

function createHoverHighlight() {
    if (hoverHighlight) {
        return hoverHighlight;
    }

    hoverHighlight = document.createElement('div');
    hoverHighlight.id = 'hover-highlight';

    hoverHighlight.style.position = 'absolute';
    hoverHighlight.style.width = '60px';
    hoverHighlight.style.height = '60px';
    hoverHighlight.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    hoverHighlight.style.border = '2px solid rgba(255, 255, 255, 0.5)';
    hoverHighlight.style.borderRadius = '5px';
    hoverHighlight.style.pointerEvents = 'none';
    hoverHighlight.style.zIndex = '90';
    hoverHighlight.style.display = 'none';

    document.body.appendChild(hoverHighlight);

    return hoverHighlight;
}

function updateHoverPosition(event, canvas, eye, at, up, projectionMatrix) {
    if (!hoverHighlight) {
        hoverHighlight = createHoverHighlight();
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const boardPos = screenToBoard(x, y, canvas, eye, at, up, projectionMatrix);

    if (boardPos) {
        const { row, col } = boardPos;

        const boardX = col - 3.5;
        const boardY = 0.01;
        const boardZ = (7 - row) - 3.5;

        const worldPos = vec4.fromValues(boardX, boardY, boardZ, 1.0);

        const viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, eye, at, up);

        const viewProjectionMatrix = mat4.create();
        mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

        const clipPos = vec4.create();
        vec4.transformMat4(clipPos, worldPos, viewProjectionMatrix);

        const ndcX = clipPos[0] / clipPos[3];
        const ndcY = clipPos[1] / clipPos[3];

        const screenX = (ndcX + 1) * 0.5 * canvas.width;
        const screenY = (1 - (ndcY + 1) * 0.5) * canvas.height;

        hoverHighlight.style.left = `${screenX - 30}px`;
        hoverHighlight.style.top = `${screenY - 30}px`;
        hoverHighlight.style.display = 'block';

        const distance = vec3.distance(eye, [boardX, boardY, boardZ]);
        const scale = Math.max(0.5, Math.min(1.5, 10 / distance));
        hoverHighlight.style.transform = `scale(${scale})`;
    } else {
        hoverHighlight.style.display = 'none';
    }
}

function screenToBoard(x, y, canvas, eye, at, up, projectionMatrix) {
    const ndcX = (2.0 * x) / canvas.width - 1.0;
    const ndcY = 1.0 - (2.0 * y) / canvas.height;

    const clipCoords = vec4.fromValues(ndcX, ndcY, -1.0, 1.0);

    const invProjectionMatrix = mat4.create();
    mat4.invert(invProjectionMatrix, projectionMatrix);
    const eyeCoords = vec4.create();
    vec4.transformMat4(eyeCoords, clipCoords, invProjectionMatrix);
    eyeCoords[2] = -1.0;
    eyeCoords[3] = 0.0;

    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, eye, at, up);
    const invViewMatrix = mat4.create();
    mat4.invert(invViewMatrix, viewMatrix);
    const worldCoords = vec4.create();
    vec4.transformMat4(worldCoords, eyeCoords, invViewMatrix);
    const rayDirection = vec3.fromValues(worldCoords[0], worldCoords[1], worldCoords[2]);
    vec3.normalize(rayDirection, rayDirection);

    const rayOrigin = eye;
    const planeNormal = vec3.fromValues(0, 1, 0);
    const planePoint = vec3.fromValues(0, 0, 0);

    const denominator = vec3.dot(planeNormal, rayDirection);
    if (Math.abs(denominator) > 0.0001) {
        const t = vec3.dot(vec3.sub(vec3.create(), planePoint, rayOrigin), planeNormal) / denominator;
        if (t >= 0) {
            const intersection = vec3.create();
            vec3.scaleAndAdd(intersection, rayOrigin, rayDirection, t);

            const boardX = Math.floor(intersection[0] + 4);
            const boardZ = Math.floor(intersection[2] + 4);

            if (boardX >= 0 && boardX < 8 && boardZ >= 0 && boardZ < 8) {
                return { row: 7 - boardZ, col: boardX };
            }
        }
    }

    return null;
}

function hideHoverHighlight() {
    if (hoverHighlight) {
        hoverHighlight.style.display = 'none';
    }
}

export { createHoverHighlight, updateHoverPosition, hideHoverHighlight };
