import * as THREE from 'three';
import * as LIBAMMO from 'ammojs3'

export let Ammo : typeof LIBAMMO.default;

let collisionConfiguration;
let dispatcher;
let broadphase;
let solver;
let softBodySolver;
let physicsWorld : LIBAMMO.default.btSoftRigidDynamicsWorld;

const defaultFriction = 0.8;

function initPhysicsInternal() {
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
    body.setFriction(defaultFriction);
    threeObject.userData.physicsBody = body;

    if ( mass > 0 ) {
        // Disable deactivation
        body.setActivationState( 4 );
    }

    physicsWorld.addRigidBody( body );
}

export function castPhysicsRay(origin: LIBAMMO.default.btVector3, dest: LIBAMMO.default.btVector3) {
    // Returns true if ray hit,
    // TODO Mask and group filters can be added to the test (rayCallBack.m_collisionFilterGroup and m_collisionFilterMask)
    let rayCallBack = new Ammo.ClosestRayResultCallback(new Ammo.btVector3(origin.x(), origin.y(), origin.z()),
         new Ammo.btVector3(dest.x(), dest.y(), dest.z()));
    
    // Perform ray test
    physicsWorld.rayTest( rayCallBack.get_m_rayFromWorld(), rayCallBack.get_m_rayToWorld(), rayCallBack );

    return rayCallBack.hasHit();
}

export function makeBox(position: THREE.Vector3, size: THREE.Vector3, mass: number, color: THREE.ColorRepresentation | undefined) {
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

export function stepSimulation(timestep: number) {
    physicsWorld.stepSimulation( timestep, 10 );
}

export function initPhysics(nextInitCallback: Function) {
    LIBAMMO.default().then( function( AmmoLib ) {
        Ammo = AmmoLib;

        initPhysicsInternal();
        nextInitCallback();
    } );
}
