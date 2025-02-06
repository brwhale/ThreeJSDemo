import * as THREE from 'three';

import * as PHYS from './physics.js'
import * as WINDOW from './window.js'
import * as WORLD from './world.js'

export function update(lookDir: THREE.Vector3, timestep: number) {
    if (WINDOW.keys.w || WINDOW.keys.a || WINDOW.keys.s || WINDOW.keys.d) {        
        const side = new THREE.Vector3(0,1,0).cross(lookDir).normalize();
        const forward = new THREE.Vector3(0,1,0).cross(side).normalize();
        let speed = 10 * (WINDOW.keys.shift ? 3.0 : 2.0) * timestep;
        let vec = new THREE.Vector3();
        if (WINDOW.keys.w) {
            vec.add(forward.multiplyScalar(-speed));
        }
        if (WINDOW.keys.s) {
            vec.add(forward.multiplyScalar(speed));
        }
        if (WINDOW.keys.a) {
            vec.add(side.multiplyScalar(speed));
        }
        if (WINDOW.keys.d) {
            vec.add(side.multiplyScalar(-speed));
        }

        WORLD.player.applyCentralImpulse(new PHYS.Ammo.btVector3( vec.x, vec.y, vec.z ));
    }
}
