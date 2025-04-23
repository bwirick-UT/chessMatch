class Camera {
    constructor() {
        this.eye = [0, 6, 9];
        this.at = [0, 1.5, 2.3];
        this.up = [0, 1, 0];

        this.isAnimating = false;
        this.animationStartTime = 0;
        this.animationDuration = 2.0;
        this.startEye = null;
        this.startAt = null;
        this.targetEye = null;
        this.targetAt = null;

        this.rotationSpeed = 0.003;
        this.zoomSpeedFactor = 0.1;
        this.minZoomDistance = 5.0;
        this.maxZoomDistance = 20.0;
        this.boardCenter = [0, 0, 0];

        this.minPitch = 0;
        this.maxPitch = 1.4;

        this.baseYaw = 0;
        this.minYawOffset = -Math.PI/2;
        this.maxYawOffset = Math.PI/2;
    }

    getPosition() {
        return {
            eye: [...this.eye],
            at: [...this.at],
            up: [...this.up]
        };
    }

    rotateForPlayerChange(currentTime) {
        if (this.isAnimating) {
            return false;
        }

        this.startEye = [...this.eye];
        this.startAt = [...this.at];

        const eyeVector = [
            this.eye[0] - this.boardCenter[0],
            this.eye[1] - this.boardCenter[1],
            this.eye[2] - this.boardCenter[2]
        ];

        const distance = Math.sqrt(
            eyeVector[0] * eyeVector[0] +
            eyeVector[1] * eyeVector[1] +
            eyeVector[2] * eyeVector[2]
        );

        const horizontalDistance = Math.sqrt(
            eyeVector[0] * eyeVector[0] +
            eyeVector[2] * eyeVector[2]
        );

        const currentYaw = Math.atan2(eyeVector[0], eyeVector[2]);

        const currentPitch = Math.atan2(eyeVector[1], horizontalDistance);

        const targetYaw = this.normalizeAngle(currentYaw + Math.PI);

        this.baseYaw = (this.baseYaw === 0) ? Math.PI : 0;

        this.targetEye = [
            this.boardCenter[0] + distance * Math.sin(targetYaw) * Math.cos(currentPitch),
            this.boardCenter[1] + distance * Math.sin(currentPitch),
            this.boardCenter[2] + distance * Math.cos(targetYaw) * Math.cos(currentPitch)
        ];

        this.targetAt = [
            this.boardCenter[0],
            this.boardCenter[1] + 0.5,
            this.boardCenter[2]
        ];

        this.animationDuration = 2.0;

        this.isAnimating = true;
        this.animationStartTime = currentTime;

        return true;
    }

    update(currentTime) {
        if (!this.isAnimating) {
            return false;
        }

        const elapsed = currentTime - this.animationStartTime;
        let progress = elapsed / this.animationDuration;

        if (progress >= 1.0) {
            this.eye = [...this.targetEye];
            this.at = [...this.targetAt];
            this.isAnimating = false;
            return true;
        }

        const easedProgress = this.easeInOutCubic(progress);

        const startEyeVector = [
            this.startEye[0] - this.boardCenter[0],
            this.startEye[1] - this.boardCenter[1],
            this.startEye[2] - this.boardCenter[2]
        ];

        const targetEyeVector = [
            this.targetEye[0] - this.boardCenter[0],
            this.targetEye[1] - this.boardCenter[1],
            this.targetEye[2] - this.boardCenter[2]
        ];

        const startDistance = Math.sqrt(
            startEyeVector[0] * startEyeVector[0] +
            startEyeVector[1] * startEyeVector[1] +
            startEyeVector[2] * startEyeVector[2]
        );

        const arcHeight = 2.0;
        const arcFactor = Math.sin(easedProgress * Math.PI) * arcHeight;

        const zoomFactor = 1.0 + Math.sin(easedProgress * Math.PI) * 0.15;
        const currentDistance = startDistance * zoomFactor;

        const startHorizontalDistance = Math.sqrt(
            startEyeVector[0] * startEyeVector[0] +
            startEyeVector[2] * startEyeVector[2]
        );
        const startYaw = Math.atan2(startEyeVector[0], startEyeVector[2]);
        const startPitch = Math.atan2(startEyeVector[1], startHorizontalDistance);

        const targetHorizontalDistance = Math.sqrt(
            targetEyeVector[0] * targetEyeVector[0] +
            targetEyeVector[2] * targetEyeVector[2]
        );
        const targetYaw = Math.atan2(targetEyeVector[0], targetEyeVector[2]);
        const targetPitch = Math.atan2(targetEyeVector[1], targetHorizontalDistance);

        let currentYaw = startYaw + this.normalizeAngle(targetYaw - startYaw) * easedProgress;
        let currentPitch = startPitch + (targetPitch - startPitch) * easedProgress;

        currentPitch += Math.sin(easedProgress * Math.PI) * 0.15;

        this.eye[0] = this.boardCenter[0] + currentDistance * Math.sin(currentYaw) * Math.cos(currentPitch);
        this.eye[1] = this.boardCenter[1] + currentDistance * Math.sin(currentPitch) + arcFactor;
        this.eye[2] = this.boardCenter[2] + currentDistance * Math.cos(currentYaw) * Math.cos(currentPitch);

        this.at[0] = this.startAt[0] + (this.targetAt[0] - this.startAt[0]) * easedProgress;
        this.at[1] = this.startAt[1] + (this.targetAt[1] - this.startAt[1]) * easedProgress + arcFactor * 0.3;
        this.at[2] = this.startAt[2] + (this.targetAt[2] - this.startAt[2]) * easedProgress;

        return true;
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }



    orbit(screenDx, screenDy) {
        if (this.isAnimating) return false;

        const eyeVector = [
            this.eye[0] - this.boardCenter[0],
            this.eye[1] - this.boardCenter[1],
            this.eye[2] - this.boardCenter[2]
        ];

        const distance = Math.sqrt(
            eyeVector[0] * eyeVector[0] +
            eyeVector[1] * eyeVector[1] +
            eyeVector[2] * eyeVector[2]
        );


        const horizontalDistance = Math.sqrt(
            eyeVector[0] * eyeVector[0] +
            eyeVector[2] * eyeVector[2]
        );

        let yaw = Math.atan2(eyeVector[0], eyeVector[2]);

        let pitch = Math.atan2(eyeVector[1], horizontalDistance);

        let yawOffset = this.normalizeAngle(yaw - this.baseYaw);

        yawOffset += screenDx * this.rotationSpeed;
        pitch -= screenDy * this.rotationSpeed;

        yawOffset = Math.max(this.minYawOffset, Math.min(this.maxYawOffset, yawOffset));

        yaw = this.baseYaw + yawOffset;

        pitch = Math.max(this.minPitch, Math.min(this.maxPitch, pitch));

        const newEyeVector = [
            distance * Math.sin(yaw) * Math.cos(pitch),
            distance * Math.sin(pitch),
            distance * Math.cos(yaw) * Math.cos(pitch)
        ];

        this.eye[0] = this.boardCenter[0] + newEyeVector[0];
        this.eye[1] = this.boardCenter[1] + newEyeVector[1];
        this.eye[2] = this.boardCenter[2] + newEyeVector[2];

        this.at[0] = this.boardCenter[0];
        this.at[1] = this.boardCenter[1];
        this.at[2] = this.boardCenter[2];

        return true;
    }

    zoom(scrollAmount) {
        if (this.isAnimating) return false;

        const offset = [
            this.eye[0] - this.at[0],
            this.eye[1] - this.at[1],
            this.eye[2] - this.at[2]
        ];

        const currentDistance = Math.sqrt(
            offset[0] * offset[0] +
            offset[1] * offset[1] +
            offset[2] * offset[2]
        );

        const distanceChangeFactor = 1.0 + scrollAmount * this.zoomSpeedFactor;
        let newDistance = currentDistance * distanceChangeFactor;

        newDistance = Math.max(this.minZoomDistance, Math.min(this.maxZoomDistance, newDistance));

        const scaleFactor = newDistance / currentDistance;

        this.eye[0] = this.at[0] + offset[0] * scaleFactor;
        this.eye[1] = this.at[1] + offset[1] * scaleFactor;
        this.eye[2] = this.at[2] + offset[2] * scaleFactor;

        return true;
    }
}

export { Camera };
