import * as THREE from 'three';
import * as LIBAMMO from 'ammojs3'

import * as PHYS from './physics.js'
import * as WINDOW from './window.js'
import * as WORLD from './world.js'

let canJump = false;
const jumpClock = new THREE.Clock();

function flatten(dir: THREE.Vector3, up: THREE.Vector3) {
	const side = new THREE.Vector3().copy(dir).cross(up);
	return new THREE.Vector3().copy(up).cross(side);
}

let jumpVec: LIBAMMO.default.btVector3;
let moveVec: LIBAMMO.default.btVector3;
let blockBuilding = false;

export function init() {
    jumpVec = new PHYS.Ammo.btVector3( 0, 50.1, 0);
    moveVec = new PHYS.Ammo.btVector3( 0, 0, 0);
}

function getRandomColor() {
    return new THREE.Color().setHSL(360*Math.random(), 0.5 + Math.random()/2, 0.5);
}

function getDistanceFromLine(lineStart: THREE.Vector3, lineEnd: THREE.Vector3, point: THREE.Vector3) : number {
    const direction = new THREE.Vector3().copy(lineEnd).sub(lineStart);
    const pointDirection = new THREE.Vector3().copy(point).sub(lineStart);
    return pointDirection.cross(direction).length()/direction.length();
}

export function update(lookDir: THREE.Vector3, timestep: number) {
    if (WINDOW.keys.w || WINDOW.keys.a || WINDOW.keys.s || WINDOW.keys.d) {        
        const side = new THREE.Vector3(0,1,0).cross(lookDir).normalize();
        const forward = new THREE.Vector3(0,1,0).cross(side).normalize();
        const walkForce = (WINDOW.keys.shift ? 3.5 : 2.4);
        const speedLimit = (WINDOW.keys.shift ? 15 : 10);
        const speed = flatten(PHYS.fromBT(WORLD.playerObject.getLinearVelocity()), new THREE.Vector3(0,1,0)).length();
        let speedMult = 0; 
        if (speed < speedLimit) {
            speedMult = timestep * Math.max(0, 16 * walkForce);
        }

        const vec = new THREE.Vector3();
        if (WINDOW.keys.w) {
            vec.add(forward.multiplyScalar(-1));
        }
        if (WINDOW.keys.s) {
            vec.add(forward);
        }
        if (WINDOW.keys.a) {
            vec.add(side);
        }
        if (WINDOW.keys.d) {
            vec.add(side.multiplyScalar(-1));
        }

        vec.normalize().multiplyScalar(speedMult);
        moveVec.setValue(vec.x, vec.y, vec.z );

        WORLD.playerObject.applyCentralImpulse(moveVec);
    }
    const playerPos = WORLD.playerMesh.position;
    const playerJumpTestPoint = new THREE.Vector3(0, -.7, 0).add(playerPos);
    canJump = jumpClock.getElapsedTime() > .35 && PHYS.castPhysicsRay(playerPos, playerJumpTestPoint) != undefined;
    if (canJump && WINDOW.keys[" "]) {
        WORLD.playerObject.applyCentralImpulse(jumpVec);
        jumpClock.start();
    }
    if (WINDOW.keys.b) {
        if (!blockBuilding) {
            blockBuilding = true;
            WORLD.makeBox(new THREE.Vector3(0, -1.5, 0).add(WORLD.playerMesh.position),
                new THREE.Vector3(4, 1, 4), 0, getRandomColor()); 
        }
    } else {
        blockBuilding = false;
    }
}
