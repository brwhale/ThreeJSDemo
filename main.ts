import * as THREE from 'three';
import * as LIBAMMO from 'ammojs3'

import * as PHYS from './physics.js'
import * as WORLD from './world.js'
import * as WINDOW from './window.js'


// declare for physics engine
let Ammo : typeof LIBAMMO.default;

// set up vars for renderer
const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
document.body.appendChild( renderer.domElement );
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const lookDir = new THREE.Vector3(0,0,1);
let renderSize = {x: 0, y: 0};


// timing vars
const clock = new THREE.Clock();
let globalTime = 0;

function updatePhysics( timestep: number ) {
    // Step world
    PHYS.stepSimulation( timestep );

    // copy positions and rotations to threejs
    const tempTransform = new Ammo.btTransform();
    for ( let i = 0, il = WORLD.rigidBodies.length; i < il; i ++ ) {
        const objThree = WORLD.rigidBodies[ i ];
        const objPhys = objThree.userData.physicsBody;
        const ms = objPhys.getMotionState();
        if ( ms ) {
            ms.getWorldTransform( tempTransform );
            const p = tempTransform.getOrigin();
            const q = tempTransform.getRotation();
            objThree.position.set( p.x(), p.y(), p.z() );
            objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
        }
    }
}

function animate() {
    const timestep = clock.getDelta();
    globalTime += timestep;

    if (WINDOW.keys.w || WINDOW.keys.a || WINDOW.keys.s || WINDOW.keys.d) {        
        const forward = new THREE.Vector3(lookDir.x, lookDir.y, lookDir.z);
        const side = new THREE.Vector3(forward.x, forward.y, forward.z);
        side.cross(new THREE.Vector3(0,1,0)).normalize();
        forward.set(side.x, side.y, side.z);
        forward.cross(new THREE.Vector3(0,1,0)).normalize();
        let speed = 10 * (WINDOW.keys.shift ? 3.0 : 2.0) * timestep;
        let vec = new THREE.Vector3();
        if (WINDOW.keys.w) {
            vec.add(forward.multiplyScalar(-speed));
        }
        if (WINDOW.keys.s) {
            vec.add(forward.multiplyScalar(speed));
        }
        if (WINDOW.keys.a) {
            vec.add(side.multiplyScalar(-speed));
        }
        if (WINDOW.keys.d) {
            vec.add(side.multiplyScalar(speed));
        }

        WORLD.player.applyCentralImpulse(new Ammo.btVector3( vec.x, vec.y, vec.z ));
    }

    updatePhysics(timestep);

    if (renderSize.x != window.innerWidth || renderSize.y != window.innerHeight) {
        renderSize = {x: window.innerWidth, y: window.innerHeight}
        camera.aspect = renderSize.x / renderSize.y;
        renderer.setSize( renderSize.x, renderSize.y );      
    }
    
    camera.position.copy(new THREE.Vector3(0, 1,0).add(WORLD.playerMesh.position));
    camera.lookAt(new THREE.Vector3().add(camera.position).add(lookDir));
    camera.updateProjectionMatrix();

	renderer.render( WORLD.scene, camera );
}

function inititalize() {
    Ammo = PHYS.Ammo;
    WINDOW.initWindow(lookDir);
    WORLD.createWorld();
    renderer.setAnimationLoop( animate );
}

PHYS.initPhysics(inititalize);