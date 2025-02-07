import * as THREE from 'three';
import * as LIBAMMO from 'ammojs3'

import * as WORLD from './world.js'

export let Ammo : typeof LIBAMMO.default;

let collisionConfiguration;
let dispatcher;
let broadphase;
let solver;
let softBodySolver;
let physicsWorld : LIBAMMO.default.btSoftRigidDynamicsWorld;

const defaultFriction = 0.8;

export function fromBT(vecin: LIBAMMO.default.btVector3) : THREE.Vector3 {
    return new THREE.Vector3(vecin.x(), vecin.y(), vecin.z());
}

export function toBT(vecin: THREE.Vector3) : LIBAMMO.default.btVector3 {
    return new Ammo.btVector3(vecin.x, vecin.y, vecin.z);
}

function getRigidBodyFromCollisionObject(body : LIBAMMO.default.btCollisionObject) : LIBAMMO.default.btRigidBody {
    return (Ammo as any).castObject(body, Ammo.btRigidBody ) as LIBAMMO.default.btRigidBody;
}

export function setPosition(body : LIBAMMO.default.btRigidBody, position : THREE.Vector3) {
    const tempTransform = new Ammo.btTransform();
    const pos = toBT(position);
    const ms = body.getMotionState();
    // set both the regular transform and the motion state
    body.getWorldTransform().setOrigin(pos);
    if (ms) {
        ms.getWorldTransform(tempTransform);
        tempTransform.setOrigin(pos);
        ms.setWorldTransform(tempTransform);
    }
    const stopvel = new Ammo.btVector3(0, 0, 0);
    body.setLinearVelocity(stopvel);

    Ammo.destroy(pos);
    Ammo.destroy(stopvel);
    Ammo.destroy(tempTransform);
}

function initPhysicsInternal() {
    const gravityConstant = - 9.8;
    collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
    dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
    broadphase = new Ammo.btDbvtBroadphase();
    solver = new Ammo.btSequentialImpulseConstraintSolver();
    softBodySolver = new Ammo.btDefaultSoftBodySolver();
    physicsWorld = new Ammo.btSoftRigidDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration, softBodySolver );
    const gravityVector = new Ammo.btVector3( 0, gravityConstant, 0 );
    physicsWorld.setGravity( gravityVector );
    physicsWorld.getWorldInfo().set_m_gravity( gravityVector );
    Ammo.destroy(gravityVector);
}

function createRigidBody(threeObject : THREE.Object3D, physicsShape : LIBAMMO.default.btCollisionShape, mass: number) {
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    const position = toBT(threeObject.position);
    transform.setOrigin( position );
    Ammo.destroy(position);
    transform.setRotation( new Ammo.btQuaternion( threeObject.quaternion.x, threeObject.quaternion.y, threeObject.quaternion.z, threeObject.quaternion.w ) );
    const motionState = new Ammo.btDefaultMotionState( transform );
    const localInertia = new Ammo.btVector3( 0, 0, 0 );
    physicsShape.calculateLocalInertia( mass, localInertia );
    const rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, physicsShape, localInertia );
    Ammo.destroy(localInertia);
    const body = new Ammo.btRigidBody( rbInfo );
    body.setFriction(defaultFriction);
    threeObject.userData.physicsBody = body;
    (body as any).threeObject = threeObject;
    if ( mass > 0 ) {
        // Disable deactivation
        body.setActivationState( 4 );
    }

    physicsWorld.addRigidBody( body );
}

function handleCollisonWithPlayer(object: THREE.Object3D) {
    if ((object.userData.collisionCooldown as THREE.Clock).getDelta() > .3) {
        const child = object as THREE.Mesh;
        const mat = child.material as THREE.MeshPhongMaterial
        if (mat) {
            mat.color = mat.color.addScalar(-.2);
        }
    }
}

function detectCollision(){
	const dispatcher = physicsWorld.getDispatcher();
	const numManifolds = dispatcher.getNumManifolds();

	for ( let i = 0; i < numManifolds; i ++ ) {
		const contactManifold = dispatcher.getManifoldByIndexInternal( i );
		const numContacts = contactManifold.getNumContacts();
        const rb0 = getRigidBodyFromCollisionObject(contactManifold.getBody0());
        const rb1 = getRigidBodyFromCollisionObject(contactManifold.getBody1());

        let closestDistance = 10000000.0;
        let highestForce = 0;

		for ( let j = 0; j < numContacts; j++ ) {
			const contactPoint = contactManifold.getContactPoint( j );
			const distance = contactPoint.getDistance();
            const force = contactPoint.getAppliedImpulse();
            closestDistance = Math.min(distance, closestDistance);
            highestForce = Math.max(force, highestForce);
		}

        if (closestDistance < 0.1 && highestForce > 0.01 && (rb0.getMass() > 0 && rb1.getMass() > 0)) {
            const obj1 = (rb0 as any).threeObject as THREE.Object3D;
            const obj2 = (rb1 as any).threeObject as THREE.Object3D;
            if (obj1 === WORLD.playerMesh || obj2 === WORLD.playerMesh) {
                const otherObj = obj1 === WORLD.playerMesh ? obj2 : obj1;
                handleCollisonWithPlayer(otherObj);
            }
        }
	}
}

export function castPhysicsRay(origin3: THREE.Vector3, dest3: THREE.Vector3) : THREE.Vector3 | undefined {
    const origin = toBT(origin3);
    const dest = toBT(dest3);
    const rayCallBack = new Ammo.ClosestRayResultCallback(origin, dest);
    physicsWorld.rayTest( rayCallBack.get_m_rayFromWorld(), rayCallBack.get_m_rayToWorld(), rayCallBack );
    const result = rayCallBack.hasHit();
    const position = fromBT(rayCallBack.get_m_hitPointWorld());
    Ammo.destroy(origin);
    Ammo.destroy(rayCallBack);
    Ammo.destroy(dest);
    if (result) {
        return position;
    } else {
        return undefined
    }
}

export function castPhysicsRayPicker(origin3: THREE.Vector3, dest3: THREE.Vector3) : LIBAMMO.default.btRigidBody | undefined {
    const origin = toBT(origin3);
    const dest = toBT(dest3);
    const rayCallBack = new Ammo.ClosestRayResultCallback(origin, dest);
    physicsWorld.rayTest( rayCallBack.get_m_rayFromWorld(), rayCallBack.get_m_rayToWorld(), rayCallBack );
    const result = rayCallBack.hasHit();
    const hitObj = getRigidBodyFromCollisionObject(rayCallBack.get_m_collisionObject());
    Ammo.destroy(origin);
    Ammo.destroy(rayCallBack);
    Ammo.destroy(dest);
    if (result) {
        return hitObj;
    } else {
        return undefined
    }
}

export function makeBox(position: THREE.Vector3, size: THREE.Vector3, mass: number, color: THREE.ColorRepresentation | undefined) {
    const geometry = new THREE.BoxGeometry( size.x,size.y,size.z );
    const material = new THREE.MeshPhongMaterial( {color: color} );    
    const cube = new THREE.Mesh( geometry, material );
    cube.receiveShadow = true;
    cube.castShadow = true;
    cube.userData.collisionCooldown = new THREE.Clock();
    cube.userData.collisionCooldown.start();
    cube.position.copy(position);
    const halfExtents = new Ammo.btVector3(size.x * .5,size.y * .5,size.z * .5);
    const cubeShape = new Ammo.btBoxShape(halfExtents);
    createRigidBody(cube, cubeShape, mass);
    Ammo.destroy(halfExtents);
    return cube;
}

export function addPhysicsToMesh(
    obj: THREE.Object3D, 
    mass: number,
) {
    const mesh = obj as THREE.Mesh;
    const size = obj.scale;
    const g = mesh.geometry;
    const indexes = g.getIndex();
    const vert1 = new Ammo.btVector3();
    const vert2 = new Ammo.btVector3();
    const vert3 = new Ammo.btVector3();
    if (indexes) {
        const triangleMesh = new Ammo.btTriangleMesh();
        const points = g.attributes.position;
        for(let i=2;i<indexes.count;i+=3){
            vert1.setValue(
                points.getX(indexes.array[i]) * size.x,
                points.getY(indexes.array[i]) * size.y,
                points.getZ(indexes.array[i]) * size.z
            );
            vert2.setValue(
                points.getX(indexes.array[i-1]) * size.x,
                points.getY(indexes.array[i-1]) * size.y,
                points.getZ(indexes.array[i-1]) * size.z
            );
            vert3.setValue(
                points.getX(indexes.array[i-2]) * size.x,
                points.getY(indexes.array[i-2]) * size.y,
                points.getZ(indexes.array[i-2]) * size.z
            );
            triangleMesh.addTriangle(vert1, vert2, vert3);
        }

        const meshShape = new Ammo.btBvhTriangleMeshShape(triangleMesh, true);
        createRigidBody(obj, meshShape, mass);
    }
    obj.castShadow = true;
    obj.receiveShadow = true;
    Ammo.destroy(vert1);
    Ammo.destroy(vert2);
    Ammo.destroy(vert3);
}


export function stepSimulation(timestep: number) {
    physicsWorld.stepSimulation( timestep, 10 );

    detectCollision();
}

export function initPhysics(nextInitCallback: Function) {
    LIBAMMO.default().then( function( AmmoLib ) {
        Ammo = AmmoLib;

        initPhysicsInternal();
        nextInitCallback();
    } );
}
