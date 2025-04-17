// Camera control for chess game

class Camera {
    constructor() {
        // Initial camera position (white player's view)
        this.eye = [0, 6, 9];
        this.at = [0, 1.5, 2.3];
        this.up = [0, 1, 0];

        // Animation properties
        this.isAnimating = false;
        this.animationStartTime = 0;
        this.animationDuration = 1.0; // seconds
        this.startEye = null;
        this.startAt = null;
        this.targetEye = null;
        this.targetAt = null;

        // Observation mode properties
        this.rotationSpeed = 0.003; // Reduced for smoother movement
        this.zoomSpeedFactor = 0.1;
        this.minZoomDistance = 5.0;
        this.maxZoomDistance = 20.0;
        this.boardCenter = [0, 0, 0]; // Center of the chess board

        // Orbit constraints
        this.minPitch = 0; // Prevent looking underneath the board (table-level view)
        this.maxPitch = 1.4;  // About 80 degrees in radians (PI/2 is 90 degrees)

        // Horizontal rotation constraints (in radians)
        this.baseYaw = 0; // Initial yaw for white player (facing +z direction)
        this.minYawOffset = -Math.PI/2; // 90 degrees left
        this.maxYawOffset = Math.PI/2;  // 90 degrees right
    }

    // Get current camera position
    getPosition() {
        return {
            eye: [...this.eye],
            at: [...this.at],
            up: [...this.up]
        };
    }

    // Rotate camera 180 degrees around the board center
    rotateForPlayerChange(currentTime) {
        if (this.isAnimating) {
            return false; // Already animating
        }

        // Store starting position
        this.startEye = [...this.eye];
        this.startAt = [...this.at];

        // Calculate target position (180 degree rotation around board center)
        this.targetEye = [
            -this.eye[0],
            this.eye[1],
            -this.eye[2]
        ];

        this.targetAt = [
            -this.at[0],
            this.at[1],
            -this.at[2]
        ];

        // Flip the base yaw for the new player's perspective
        this.baseYaw = (this.baseYaw === 0) ? Math.PI : 0;

        // Start animation
        this.isAnimating = true;
        this.animationStartTime = currentTime;

        return true;
    }

    // Update camera position during animation
    update(currentTime) {
        if (!this.isAnimating) {
            return false;
        }

        // Calculate animation progress
        const elapsed = currentTime - this.animationStartTime;
        let progress = elapsed / this.animationDuration;

        // Animation complete
        if (progress >= 1.0) {
            this.eye = [...this.targetEye];
            this.at = [...this.targetAt];
            this.isAnimating = false;
            return true;
        }

        // Smooth the animation using easing function
        progress = this.easeInOutQuad(progress);

        // Interpolate between start and target positions
        for (let i = 0; i < 3; i++) {
            this.eye[i] = this.startEye[i] + (this.targetEye[i] - this.startEye[i]) * progress;
            this.at[i] = this.startAt[i] + (this.targetAt[i] - this.startAt[i]) * progress;
        }

        return true;
    }

    // Easing function for smooth animation
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    // Helper function to normalize angle to range [-PI, PI]
    normalizeAngle(angle) {
        // Normalize angle to [-PI, PI] range
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }



    // Orbit the camera around the board center
    orbit(screenDx, screenDy) {
        if (this.isAnimating) return false;

        // Get vector from board center to eye
        const eyeVector = [
            this.eye[0] - this.boardCenter[0],
            this.eye[1] - this.boardCenter[1],
            this.eye[2] - this.boardCenter[2]
        ];

        // Calculate distance from eye to board center
        const distance = Math.sqrt(
            eyeVector[0] * eyeVector[0] +
            eyeVector[1] * eyeVector[1] +
            eyeVector[2] * eyeVector[2]
        );

        // Convert to spherical coordinates
        // We need to find the current yaw and pitch angles

        // Calculate horizontal distance in xz-plane
        const horizontalDistance = Math.sqrt(
            eyeVector[0] * eyeVector[0] +
            eyeVector[2] * eyeVector[2]
        );

        // Current yaw (rotation around y-axis)
        let yaw = Math.atan2(eyeVector[0], eyeVector[2]);

        // Current pitch (angle from xz-plane)
        let pitch = Math.atan2(eyeVector[1], horizontalDistance);

        // Calculate yaw offset from base yaw
        let yawOffset = this.normalizeAngle(yaw - this.baseYaw);

        // Apply mouse movement to angles
        yawOffset += screenDx * this.rotationSpeed;
        pitch -= screenDy * this.rotationSpeed;

        // Clamp yaw offset to prevent rotating too far around
        yawOffset = Math.max(this.minYawOffset, Math.min(this.maxYawOffset, yawOffset));

        // Calculate final yaw
        yaw = this.baseYaw + yawOffset;

        // Clamp pitch to prevent going under the board or too far above
        pitch = Math.max(this.minPitch, Math.min(this.maxPitch, pitch));

        // Convert back to Cartesian coordinates
        const newEyeVector = [
            distance * Math.sin(yaw) * Math.cos(pitch),
            distance * Math.sin(pitch),
            distance * Math.cos(yaw) * Math.cos(pitch)
        ];

        // Update eye position
        this.eye[0] = this.boardCenter[0] + newEyeVector[0];
        this.eye[1] = this.boardCenter[1] + newEyeVector[1];
        this.eye[2] = this.boardCenter[2] + newEyeVector[2];

        // Keep looking at the board center
        this.at[0] = this.boardCenter[0];
        this.at[1] = this.boardCenter[1];
        this.at[2] = this.boardCenter[2];

        return true;
    }

    // Zoom the camera in or out
    zoom(scrollAmount) {
        if (this.isAnimating) return false;

        // Calculate vector from at to eye
        const offset = [
            this.eye[0] - this.at[0],
            this.eye[1] - this.at[1],
            this.eye[2] - this.at[2]
        ];

        // Calculate current distance
        const currentDistance = Math.sqrt(
            offset[0] * offset[0] +
            offset[1] * offset[1] +
            offset[2] * offset[2]
        );

        // Calculate new distance with zoom factor
        const distanceChangeFactor = 1.0 + scrollAmount * this.zoomSpeedFactor;
        let newDistance = currentDistance * distanceChangeFactor;

        // Clamp distance to min/max zoom limits
        newDistance = Math.max(this.minZoomDistance, Math.min(this.maxZoomDistance, newDistance));

        // Calculate scaling factor for the offset
        const scaleFactor = newDistance / currentDistance;

        // Apply scaling to offset and update eye position
        this.eye[0] = this.at[0] + offset[0] * scaleFactor;
        this.eye[1] = this.at[1] + offset[1] * scaleFactor;
        this.eye[2] = this.at[2] + offset[2] * scaleFactor;

        return true;
    }
}

export { Camera };
