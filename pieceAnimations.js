class PieceAnimations {
    constructor() {
        this.animations = [];

        this.ATTACK_DURATION = 0.8;
        this.DEATH_DURATION = 1.2;
        this.MOVE_DURATION = 1.0;
        this.ATTACK_DISTANCE = 0.4;
        this.DEATH_SIDE_DISTANCE = 3.0;
        this.DEATH_UP_DISTANCE = 1.0;
        this.DEATH_SPIN_SPEED = 5.0;
        this.MOVE_HEIGHT = 0.5;
    }

    addAttackAnimation(fromRow, fromCol, toRow, toCol, startTime) {
        const dirCol = toCol - fromCol;
        const dirRow = toRow - fromRow;

        const dirX = dirCol;
        const dirZ = -dirRow;

        const length = Math.sqrt(dirX * dirX + dirZ * dirZ);
        const normDirX = dirX / length;
        const normDirZ = dirZ / length;

        this.animations.push({
            type: 'attack',
            fromRow,
            fromCol,
            toRow,
            toCol,
            startTime,
            endTime: startTime + this.ATTACK_DURATION,
            direction: { x: normDirX, z: normDirZ }
        });

        return this.ATTACK_DURATION;
    }

    addDeathAnimation(row, col, startTime) {
        this.animations.push({
            type: 'death',
            row,
            col,
            startTime,
            endTime: startTime + this.DEATH_DURATION,
            rotationAxis: {
                x: Math.random() * 2 - 1,
                y: Math.random() * 2 - 1,
                z: Math.random() * 2 - 1
            }
        });

        return this.DEATH_DURATION;
    }

    addMoveAnimation(fromRow, fromCol, toRow, toCol, startTime) {
        const dirCol = toCol - fromCol;
        const dirRow = toRow - fromRow;

        const dirX = dirCol;
        const dirZ = -dirRow;

        this.animations.push({
            type: 'move',
            fromRow,
            fromCol,
            toRow,
            toCol,
            startTime,
            endTime: startTime + this.MOVE_DURATION,
            direction: { x: dirX, z: dirZ }
        });

        return this.MOVE_DURATION;
    }

    applyAnimations(modelViewMatrix, row, col, currentTime) {
        let animationApplied = false;

        for (let i = 0; i < this.animations.length; i++) {
            const anim = this.animations[i];

            if (currentTime > anim.endTime) {
                continue;
            }

            const progress = (currentTime - anim.startTime) / (anim.endTime - anim.startTime);

            if (anim.type === 'attack' && anim.fromRow === row && anim.fromCol === col) {
                animationApplied = this.applyAttackAnimation(modelViewMatrix, anim, progress);
            } else if (anim.type === 'death' && anim.row === row && anim.col === col) {
                animationApplied = this.applyDeathAnimation(modelViewMatrix, anim, progress);
            } else if (anim.type === 'move' && anim.fromRow === row && anim.fromCol === col) {
                animationApplied = this.applyMoveAnimation(modelViewMatrix, anim, progress);
            }
        }

        this.cleanupAnimations(currentTime);

        return animationApplied;
    }

    applyAttackAnimation(modelViewMatrix, anim, progress) {

        let moveX, moveZ, moveY;

        if (progress < 0.2) {
            const windupProgress = progress / 0.2;
            moveX = -anim.direction.x * this.ATTACK_DISTANCE * 0.2 * Math.sin(windupProgress * Math.PI/2);
            moveZ = -anim.direction.z * this.ATTACK_DISTANCE * 0.2 * Math.sin(windupProgress * Math.PI/2);
            moveY = 0.05 * Math.sin(windupProgress * Math.PI);
        } else if (progress < 0.5) {
            const lungeProgress = (progress - 0.2) / 0.3;
            moveX = anim.direction.x * this.ATTACK_DISTANCE * Math.sin(lungeProgress * Math.PI/2);
            moveZ = anim.direction.z * this.ATTACK_DISTANCE * Math.sin(lungeProgress * Math.PI/2);
            moveY = 0.1 * Math.sin(lungeProgress * Math.PI);
        } else {
            const returnProgress = (progress - 0.5) / 0.5;
            moveX = anim.direction.x * this.ATTACK_DISTANCE * (1 - returnProgress);
            moveZ = anim.direction.z * this.ATTACK_DISTANCE * (1 - returnProgress);
            moveY = 0.05 * Math.sin((1 - returnProgress) * Math.PI/2);
        }

        mat4.translate(modelViewMatrix, modelViewMatrix, [moveX, moveY, moveZ]);

        let rotationAngle;
        if (progress < 0.2) {
            rotationAngle = -Math.sin(progress / 0.2 * Math.PI) * 0.2;
        } else if (progress < 0.5) {
            rotationAngle = Math.sin((progress - 0.2) / 0.3 * Math.PI) * 0.4;
        } else {
            rotationAngle = Math.sin((1 - (progress - 0.5) / 0.5) * Math.PI) * 0.3;
        }

        const rotationAxis = [
            -anim.direction.z,
            0.2,
            anim.direction.x
        ];

        const axisLength = Math.sqrt(
            rotationAxis[0] * rotationAxis[0] +
            rotationAxis[1] * rotationAxis[1] +
            rotationAxis[2] * rotationAxis[2]
        );

        if (axisLength > 0.001) {
            rotationAxis[0] /= axisLength;
            rotationAxis[1] /= axisLength;
            rotationAxis[2] /= axisLength;

            mat4.rotate(modelViewMatrix, modelViewMatrix, rotationAngle, rotationAxis);
        }

        return true;
    }

    applyMoveAnimation(modelViewMatrix, anim, progress) {
        const moveX = anim.direction.x * progress;
        const moveZ = anim.direction.z * progress;

        const moveY = this.MOVE_HEIGHT * Math.sin(progress * Math.PI);

        mat4.translate(modelViewMatrix, modelViewMatrix, [moveX, moveY, moveZ]);

        const rotationAngle = Math.sin(progress * Math.PI * 2) * 0.1;
        mat4.rotateY(modelViewMatrix, modelViewMatrix, rotationAngle);

        return true;
    }

    applyDeathAnimation(modelViewMatrix, anim, progress) {
        const axis = anim.rotationAxis;
        const length = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);
        const normAxis = {
            x: axis.x / length,
            y: axis.y / length,
            z: axis.z / length
        };

        const sideDirection = anim.col < 4 ? -1 : 1;

        let moveX, moveY, moveZ;

        if (progress < 0.5) {
            const firstHalfProgress = progress * 2;
            moveX = sideDirection * this.DEATH_SIDE_DISTANCE * firstHalfProgress;
            moveY = this.DEATH_UP_DISTANCE * Math.sin(firstHalfProgress * Math.PI);
            moveZ = 0;
        } else {
            const secondHalfProgress = (progress - 0.5) * 2;
            moveX = sideDirection * this.DEATH_SIDE_DISTANCE * (1 + secondHalfProgress * 0.5);
            moveY = this.DEATH_UP_DISTANCE * 0.5 - secondHalfProgress * secondHalfProgress * this.DEATH_UP_DISTANCE * 2;
            moveZ = 0;
        }

        const rotationAngle = progress * this.DEATH_SPIN_SPEED;

        mat4.translate(modelViewMatrix, modelViewMatrix, [moveX, moveY, moveZ]);
        mat4.rotate(modelViewMatrix, modelViewMatrix, rotationAngle, [normAxis.x, normAxis.y, normAxis.z]);

        const scale = 1.0 - progress * 0.5;
        mat4.scale(modelViewMatrix, modelViewMatrix, [scale, scale, scale]);

        return true;
    }

    cleanupAnimations(currentTime) {
        this.animations = this.animations.filter(anim => currentTime <= anim.endTime);
    }

    isAnimating(row, col, currentTime) {
        return this.animations.some(anim =>
            currentTime <= anim.endTime &&
            ((anim.type === 'attack' && anim.fromRow === row && anim.fromCol === col) ||
             (anim.type === 'death' && anim.row === row && anim.col === col))
        );
    }

    hasRunningAnimations(currentTime) {
        return this.animations.some(anim => currentTime <= anim.endTime);
    }
}

export { PieceAnimations };
