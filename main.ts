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
renderer.shadowMap.enabled = true;
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
    const textureMaterial = new THREE.MeshPhongMaterial({
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
const sun = new THREE.DirectionalLight( 0xffffff, 3 );

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

    if ( mass > 0 ) {
        rigidBodies.push( threeObject );
        // Disable deactivation
        body.setActivationState( 4 );
    }

    physicsWorld.addRigidBody( body );
    scene.add( threeObject );
}

function makeBox(position: THREE.Vector3, size: THREE.Vector3, mass: number, color: THREE.ColorRepresentation | undefined) {
    const geometry = new THREE.BoxGeometry( size.x,size.y,size.z );
    const material = new THREE.MeshPhongMaterial( {color: color} );    
    const cube = new THREE.Mesh( geometry, material );
    cube.receiveShadow = true;
	cube.castShadow = true;
    cube.position.copy(position);
    const cubeShape = new Ammo.btBoxShape(new Ammo.btVector3(size.x,size.y,size.z).op_mul(.5));
    createRigidBody(cube, cubeShape, mass);
    return cube;
}

function createObjects() {
    makeBox(new THREE.Vector3(0,-1,0), new THREE.Vector3(100, 1, 100), 0, "grey");

    for (let i = -5; i < 5; ++i) {
        for (let j = -5; j < 5; ++j) {
            makeBox(new THREE.Vector3(i*1.2,3,j*1.2), new THREE.Vector3(1, 1, 1), 4,
                new THREE.Color().setHSL(.5 + i * 0.1, .85 + j *.1, .5));
        }
    }

    playerMesh = makeBox(new THREE.Vector3(0, 3, -10), new THREE.Vector3(1,1,1), 4, "green");
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