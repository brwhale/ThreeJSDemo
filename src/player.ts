import * as THREE from 'three';

import * as PHYS from './physics.js'
import * as WINDOW from './window.js'
import * as WORLD from './world.js'

let canJump = false;
const jumpClock = new THREE.Clock();

function flatten(dir: THREE.Vector3, up: THREE.Vector3) {
	let side = new THREE.Vector3().copy(dir).cross(up);
	return new THREE.Vector3().copy(up).cross(side);
}

export function update(lookDir: THREE.Vector3, timestep: number) {
    if (WINDOW.keys.w || WINDOW.keys.a || WINDOW.keys.s || WINDOW.keys.d) {        
        const side = new THREE.Vector3(0,1,0).cross(lookDir).normalize();
        const forward = new THREE.Vector3(0,1,0).cross(side).normalize();
        let walkForce = (WINDOW.keys.shift ? 3.5 : 2.4);
        let speedLimit = (WINDOW.keys.shift ? 15 : 10);       
        let velocity = WORLD.player.getLinearVelocity();
        let speed = flatten(new THREE.Vector3(velocity.x(), velocity.y(), velocity.z()),
            new THREE.Vector3(0,1,0)).length();
        let speedMult = 0; 
        if (speed < speedLimit) {
            speedMult = timestep * Math.max(0, 16 * walkForce);
        }
        //console.log("current speed: ", speed);
        let vec = new THREE.Vector3();
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

        WORLD.player.applyCentralImpulse(new PHYS.Ammo.btVector3( vec.x, vec.y, vec.z ));
    }
    let playerPosz = WORLD.player.getWorldTransform().getOrigin();
    let playerPos = new PHYS.Ammo.btVector3(playerPosz.x(), playerPosz.y(), playerPosz.z());
    canJump = jumpClock.getElapsedTime() > .35 &&
        PHYS.castPhysicsRay(playerPos, new PHYS.Ammo.btVector3(playerPos.x(), playerPos.y() - .7, playerPos.z()));
    if (canJump && WINDOW.keys[" "]) {
        WORLD.player.applyCentralImpulse(new PHYS.Ammo.btVector3( 0, 50.1, 0 ));
        jumpClock.start();
    }
}
