import * as THREE from 'three';
import * as LIBAMMO from 'ammojs3'
import * as PHYS from './physics.js'
import * as MODEL from './models.js'

// object references
export const scene = new THREE.Scene();
export const rigidBodies : Array<THREE.Object3D>=[];
export let playerObject: LIBAMMO.default.btRigidBody;
export let playerMesh: THREE.Object3D;
export let sunObject: THREE.Object3D;
export const sun = new THREE.SpotLight( 0xffffff, 3 );
const sunAmbient = new THREE.AmbientLight( 0xffffff, .1);
export const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

export function makeBox(position: THREE.Vector3, 
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

async function createObjects() {
    makeBox(new THREE.Vector3(0,0,0), new THREE.Vector3(200, 1, 200), 0, "grey");
    makeBox(new THREE.Vector3(100,50,0), new THREE.Vector3(1, 100, 200), 0, "blue");
    makeBox(new THREE.Vector3(-100,50,0), new THREE.Vector3(1, 100, 200), 0, "blue");
    makeBox(new THREE.Vector3(0,50,100), new THREE.Vector3(200, 100, 1), 0, "blue");
    makeBox(new THREE.Vector3(0,50,-100), new THREE.Vector3(200, 100, 1), 0, "blue");
    makeBox(new THREE.Vector3(0,100,0), new THREE.Vector3(200, 1, 200), 0, "blue");

    const sunObj = await MODEL.loadModel(new THREE.Vector3(95,95,-49), new THREE.Vector3(4, 4, 4), "out/sphere.glb", "out/yellow.png");
    if (sunObj) {
        sunObject = sunObj;
        ((sunObj as THREE.Mesh).material as THREE.MeshPhongMaterial).side = THREE.BackSide;        
    }
    
    for (let i = -5; i < 5; ++i) {
        for (let j = -5; j < 5; ++j) {
            makeBox(new THREE.Vector3(i*1.2,10,j*1.2), new THREE.Vector3(1, 1, 1), 4,
                new THREE.Color().setHSL(.5 + i * 0.1, .85 + j *.1, .5));
        }
    }
    
    for (let i = 1; i < 11; ++i) {
        for (let j = -5; j < 5; ++j) {
            makeBox(new THREE.Vector3(j*1.2, i,9), new THREE.Vector3(1.1, 1, 1.9), 4,
                new THREE.Color().setHSL(.5 + i * 0.1, .85 + j *.1, .5));
        }
    }

    playerMesh = makeBox(new THREE.Vector3(0, 1, -10), new THREE.Vector3(1,1,1), 4, "green");
    playerObject = playerMesh.userData.physicsBody;

    sun.position.set( 95, 95, -49 );
    sun.castShadow = true;

    sun.power = 400000;
    sun.angle = 3.14;

    const dLight = 200;
    const sLight = 20;
    
    sun.shadow.camera.near = 70;
    sun.shadow.camera.far = dLight;
    sun.shadow.focus = .1;

    sun.shadow.mapSize.x = 1024 * 4;
    sun.shadow.mapSize.y = 1024 * 4;

    sun.target = playerMesh;

    scene.add( sun );
    scene.add( sunAmbient );
}

export async function createWorld() {
    await createObjects();
}
