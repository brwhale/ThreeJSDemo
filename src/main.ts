import * as THREE from 'three';
import * as LIBAMMO from 'ammojs3'

import * as PHYS from './physics.js'
import * as WORLD from './world.js'
import * as WINDOW from './window.js'
import * as PLAYER from './player.js'

// declare for physics engine
let Ammo : typeof LIBAMMO.default;

// renderer and camera data
const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
document.body.appendChild( renderer.domElement );
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const lookDir = new THREE.Vector3(0,0,1);
const renderSize = new THREE.Vector2(0, 0);

// timing data
const clock = new THREE.Clock();
let globalTime = 0;

function updateObjects( timestep: number ) {
    // copy positions and rotations to threejs
    const tempTransform = new Ammo.btTransform();
    for ( let i = 0, il = WORLD.rigidBodies.length; i < il; i ++ ) {
        const objThree = WORLD.rigidBodies[ i ];
        const objPhys = objThree.userData.physicsBody as LIBAMMO.default.btRigidBody;
        const ms = objPhys.getMotionState();
        if ( ms ) {
            ms.getWorldTransform( tempTransform );
            const p = tempTransform.getOrigin();
            const q = tempTransform.getRotation();
            objThree.position.set( p.x(), p.y(), p.z() );
            objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
        }
    }
    Ammo.destroy(tempTransform);

    // sun position
    const sunRotSpeed = .1;
    const sunPos = new THREE.Vector3(Math.sin(globalTime * sunRotSpeed), 0, Math.cos(globalTime * sunRotSpeed));
    sunPos.multiplyScalar( 90 );
    sunPos.y = 90;

    WORLD.sun.position.copy(sunPos);
    WORLD.sunObject.position.copy(sunPos);
}

function frameUpdate() {
    const timestep = clock.getDelta();
    globalTime += timestep;

    PLAYER.update(lookDir, timestep);
    PHYS.stepSimulation( timestep );

    updateObjects(timestep);

    // handle resize
    if (renderSize.x != window.innerWidth || renderSize.y != window.innerHeight) {
        renderSize.set(window.innerWidth, window.innerHeight);
        camera.aspect = renderSize.x / renderSize.y;
        renderer.setSize( renderSize.x, renderSize.y );      
    }
    
    // follow player
    camera.position.copy(new THREE.Vector3(0, .85, 0)
        .add(WORLD.playerMesh.position)
        .sub(new THREE.Vector3().copy(lookDir).multiplyScalar(2.7)));
    camera.lookAt(new THREE.Vector3().add(camera.position).add(lookDir));
    camera.updateProjectionMatrix();

	renderer.render( WORLD.scene, camera );
}

async function inititalize() {
    Ammo = PHYS.Ammo;
    WINDOW.initWindow(lookDir);
    await WORLD.createWorld();
    PLAYER.init();
    renderer.setAnimationLoop( frameUpdate );
}

PHYS.initPhysics(inititalize);
