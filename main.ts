import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import * as LIBAMMO from 'ammojs3'

interface Dict<T> {
    [details: string]: T;
}
let globalTime = 0;
let renderSize = {x: 0, y: 0};
let mouseDown = false;
const keys : Dict<boolean> = {w:false, a:false, s:false, d:false};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set(0, 3, -10);
const renderer = new THREE.WebGLRenderer();
const mousePos = new THREE.Vector2();
const lookDir = new THREE.Vector3(0,0,1);
const clock = new THREE.Clock();
document.body.appendChild( renderer.domElement );
const texLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

let Ammo : typeof LIBAMMO.default;
let collisionConfiguration;
let dispatcher;
let broadphase;
let solver;
let softBodySolver;
let physicsWorld : LIBAMMO.default.btSoftRigidDynamicsWorld;

function loadModel(modelPath: string, texturePath: string) {
    const texture = texLoader.load(texturePath);
    const textureMaterial = new THREE.MeshBasicMaterial({
        map: texture,
    });

    gltfLoader.load(modelPath , function ( gltf ) {
        gltf.scene.traverse((obj) => {
            if(obj instanceof THREE.Mesh){
                obj.material = textureMaterial;
                }
            }
        )
        scene.add( gltf.scene );
    }, undefined, function ( error ) {
        console.error( error );
    } );
}

function initPhysics() {
    // Physics configuration
    const gravityConstant = - 9.8;
    collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
    dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
    broadphase = new Ammo.btDbvtBroadphase();
    solver = new Ammo.btSequentialImpulseConstraintSolver();
    softBodySolver = new Ammo.btDefaultSoftBodySolver();
    physicsWorld = new Ammo.btSoftRigidDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration, softBodySolver );
    physicsWorld.setGravity( new Ammo.btVector3( 0, gravityConstant, 0 ) );
    physicsWorld.getWorldInfo().set_m_gravity( new Ammo.btVector3( 0, gravityConstant, 0 ) );
}

function updatePhysics( timestep: number ) {
    // Step world
    physicsWorld.stepSimulation( timestep, 10 );

    // Update rigid bodies
    const tempTransform = new Ammo.btTransform();
    for ( let i = 0, il = rigidBodies.length; i < il; i ++ ) {
        const objThree = rigidBodies[ i ];
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

//loadModel('Workbench.glb', 'DefaultBumpmap.png');
const rigidBodies : Array<THREE.Object3D>=[];
let player: LIBAMMO.default.btRigidBody;
let playerMesh: THREE.Object3D;

function createRigidBody(threeObject : THREE.Object3D, physicsShape : LIBAMMO.default.btCollisionShape, mass: number) {
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( threeObject.position.x, threeObject.position.y, threeObject.position.z ) );
    transform.setRotation( new Ammo.btQuaternion( threeObject.quaternion.x, threeObject.quaternion.y, threeObject.quaternion.z, threeObject.quaternion.w ) );
    const motionState = new Ammo.btDefaultMotionState( transform );

    const localInertia = new Ammo.btVector3( 0, 0, 0 );
    physicsShape.calculateLocalInertia( mass, localInertia );

    const rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, physicsShape, localInertia );
    const body = new Ammo.btRigidBody( rbInfo );
    body.setFriction(0.5);
    threeObject.userData.physicsBody = body;

    scene.add( threeObject );

    if ( mass > 0 ) {
        rigidBodies.push( threeObject );
        // Disable deactivation
        body.setActivationState( 4 );
    }

    physicsWorld.addRigidBody( body );
}

function createObjects() {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(100, 1, 100), new THREE.MeshBasicMaterial( { color: "grey"}));
    floor.position.set(0,-1,0);
    const floorShape = new Ammo.btBoxShape( new Ammo.btVector3(50,.5,50) );
    createRigidBody(floor, floorShape, 0);

    for (let i = -5; i < 5; ++i) {
        for (let j = -5; j < 5; ++j) {
            const geometry = new THREE.BoxGeometry( 1, 1, 1 );
            const material = new THREE.MeshBasicMaterial( {color: new THREE.Color().setHSL(.5 + i * 0.1, .85 + j *.1, .5)} );
            const cube = new THREE.Mesh( geometry, material );
            cube.position.x = i*1.2;
            cube.position.z = j*1.2;
            cube.position.y = 3;
            const cubeShape = new Ammo.btBoxShape(new Ammo.btVector3(.5,.5,.5));
            createRigidBody(cube, cubeShape, 4);
        }
    }

    playerMesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color: "green"}));
    playerMesh.position.set(0, 3, -10);
    const cubeShape = new Ammo.btBoxShape(new Ammo.btVector3(.5,.5,.5));
    createRigidBody(playerMesh, cubeShape, 4);
    player = playerMesh.userData.physicsBody;
}

function animate() {
    const timestep = clock.getDelta();
    globalTime += timestep;

    if (keys.w || keys.a || keys.s || keys.d) {        
        const forward = new THREE.Vector3(lookDir.x, lookDir.y, lookDir.z);
        const side = new THREE.Vector3(forward.x, forward.y, forward.z);
        side.cross(new THREE.Vector3(0,1,0)).normalize();
        forward.set(side.x, side.y, side.z);
        forward.cross(new THREE.Vector3(0,1,0)).normalize();
        let speed = 10 * (keys.shift ? 3.0 : 2.0) * timestep;
        let vec = new THREE.Vector3();
        if (keys.w) {
            vec.add(forward.multiplyScalar(-speed));
        }
        if (keys.s) {
            vec.add(forward.multiplyScalar(speed));
        }
        if (keys.a) {
            vec.add(side.multiplyScalar(-speed));
        }
        if (keys.d) {
            vec.add(side.multiplyScalar(speed));
        }

        player.applyCentralImpulse(new Ammo.btVector3( vec.x, vec.y, vec.z ));
    }

    updatePhysics(timestep);

    if (renderSize.x != window.innerWidth || renderSize.y != window.innerHeight) {
        renderSize = {x: window.innerWidth, y: window.innerHeight}
        camera.aspect = renderSize.x / renderSize.y;
        renderer.setSize( renderSize.x, renderSize.y );      
    }
    
    camera.position.copy(new THREE.Vector3(0, 1,0).add(playerMesh.position));
    camera.lookAt(new THREE.Vector3().add(camera.position).add(lookDir));
    camera.updateProjectionMatrix();

	renderer.render( scene, camera );
}

LIBAMMO.default().then( function( AmmoLib ) {
	Ammo = AmmoLib;

	initPhysics();
    createObjects();
	renderer.setAnimationLoop( animate );
} );


window.addEventListener('mousedown', event => {
    mouseDown = true;
});
window.addEventListener('mouseup', event => {
    mouseDown = false
});  

window.addEventListener('mousemove', event => {
    const newPos = new THREE.Vector2(event.clientX, event.clientY);
    if (mouseDown) {
        let scalar = 0.001; // not using timestep since the mouse will naturally travel further if bad fps
        const side = new THREE.Vector3(0,1,0).cross(lookDir).normalize();
        lookDir.applyAxisAngle(side, scalar * (newPos.y-mousePos.y));
        lookDir.applyAxisAngle(new THREE.Vector3(0,1,0), -scalar * (newPos.x-mousePos.x));
    }
    mousePos.set(newPos.x, newPos.y);
});

window.addEventListener('keydown', event => {
    //console.log(event.key);
    keys[event.key.toLowerCase()] = true;
});
  
window.addEventListener('keyup',  event => {
    keys[event.key.toLowerCase()] = false;
});