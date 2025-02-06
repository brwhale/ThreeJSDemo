import * as THREE from 'three';
import * as LIBAMMO from 'ammojs3'
import * as PHYS from './physics.js'

// object references
export const scene = new THREE.Scene();
export const rigidBodies : Array<THREE.Object3D>=[];
export let player: LIBAMMO.default.btRigidBody;
export let playerMesh: THREE.Object3D;
const sun = new THREE.DirectionalLight( 0xffffff, 3 );

function makeBox(position: THREE.Vector3, 
        size: THREE.Vector3, 
        mass: number, 
        color: THREE.ColorRepresentation | undefined
    ) {
    let box = PHYS.makeBox(position, size, mass, color);
    if (mass > 0) {
        rigidBodies.push(box);
    }
    scene.add(box);
    return box;
}

function createObjects() {
    makeBox(new THREE.Vector3(0,-1,0), new THREE.Vector3(100, 1, 100), 0, "grey");
    
    for (let i = -5; i < 5; ++i) {
        for (let j = -5; j < 5; ++j) {
            makeBox(new THREE.Vector3(i*1.2,10,j*1.2), new THREE.Vector3(1, 1, 1), 4,
                new THREE.Color().setHSL(.5 + i * 0.1, .85 + j *.1, .5));
        }
    }
    
    for (let i = 0; i < 11; ++i) {
        for (let j = -5; j < 5; ++j) {
            makeBox(new THREE.Vector3(j*1.2, i,9), new THREE.Vector3(1.1, 1, 1.9), 4,
                new THREE.Color().setHSL(.5 + i * 0.1, .85 + j *.1, .5));
        }
    }

    playerMesh = makeBox(new THREE.Vector3(0, 0, -10), new THREE.Vector3(1,1,1), 4, "green");
    player = playerMesh.userData.physicsBody;

    sun.position.set( 100, 100, -50 );
    sun.castShadow = true;

    const dLight = 200;
    const sLight = 20;
    sun.shadow.camera.left = -sLight;
    sun.shadow.camera.right = sLight;
    sun.shadow.camera.top = sLight;
    sun.shadow.camera.bottom = -sLight;
    
    sun.shadow.camera.near = 70;
    sun.shadow.camera.far = dLight;

    sun.shadow.mapSize.x = 1024 * 2;
    sun.shadow.mapSize.y = 1024 * 2;

    sun.target = playerMesh;

    scene.add( sun );
}

export function createWorld() {
    createObjects();
}
