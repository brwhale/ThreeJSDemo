import * as THREE from 'three';
import * as LIBAMMO from 'ammojs3'

import * as PHYS from './physics.js'
import * as WORLD from './world.js'
import * as MODEL from './models.js'

interface Dict<T> {
    [details: string]: T;
}

export const keys : Dict<boolean> = {w:false, a:false, s:false, d:false};
const mousePos = new THREE.Vector2();
const mousePickOffset = new THREE.Vector2();
let mouseLook = false;
let lookDir: THREE.Vector3;
export const renderSize = new THREE.Vector2(0, 0);
export let selectedObject: LIBAMMO.default.btRigidBody | undefined;

function moveLook(x: number, y: number) {
    const scalar = 0.003; // not using timestep since the mouse will naturally travel further if bad fps
    const polarness = new THREE.Vector3(0,1,0).dot(lookDir);
    if (y > 0 ? (polarness > -.99) : (polarness < .99)) {
        const side = new THREE.Vector3(0,1,0).cross(lookDir).normalize();
        lookDir.applyAxisAngle(side, scalar * y);
    }
    lookDir.applyAxisAngle(new THREE.Vector3(0,1,0), -scalar * x);
}

export function update( timestamp: number) {
    const vec = new THREE.Vector2(0,0);
    if (keys.lw) {
        vec.y -= 1;
    }
    if (keys.ls) {
        vec.y += 1;
    }
    if (keys.la) {
        vec.x -= 1;
    }
    if (keys.ld) {
        vec.x += 1;
    }
    const sensitivity = 200.0;
    vec.multiplyScalar(timestamp * sensitivity);
    moveLook(vec.x, vec.y);
}

function getDirection(x: number, y: number) {
    return new THREE.Vector3((x / renderSize.x) * 2 - 1, (1.0 - y/ renderSize.y) * 2 - 1, 0)
        .unproject(WORLD.camera)
        .sub(WORLD.camera.position)
        .normalize();
}

export function initWindow(lookD: THREE.Vector3) {
    lookDir = lookD;

    window.addEventListener('mousedown', event => {
        if (event.button == 0){            
            const direction = getDirection(event.clientX, event.clientY);
            const rayHit = PHYS.castPhysicsRayPicker(WORLD.camera.position, 
                direction.multiplyScalar(200).add(WORLD.camera.position));
            if (rayHit) {
                selectedObject = rayHit;
                const screenCenter = new THREE.Vector3().copy(
                    ((selectedObject as any).threeObject as THREE.Object3D).position)
                    .project(WORLD.camera).multiplyScalar(.5).addScalar(.5)
                    .multiply(new THREE.Vector3(renderSize.x, renderSize.y, 0))
                mousePickOffset.set(event.clientX - screenCenter.x, event.clientY - (renderSize.y - screenCenter.y));
            }
        }
    });

    window.addEventListener('mouseup', event => {
        if (event.button == 0){
            selectedObject = undefined;
        }
    });

    document.body.addEventListener('mousemove', event => {
        const movement = new THREE.Vector2(event.movementX, event.movementY);
        if (mouseLook) {
            moveLook(movement.x, movement.y);
        }
        mousePos.set(event.clientX, event.clientY);
        if (selectedObject) {
            const objPos = (selectedObject as any).threeObject.position
            const distance = WORLD.camera.position.distanceTo(objPos);
            PHYS.setPosition(selectedObject, 
                getDirection(event.clientX - mousePickOffset.x, event.clientY - mousePickOffset.y)
                .multiplyScalar(distance).add(WORLD.camera.position));
        }
    });

    window.addEventListener('keydown', async event => {
        const lower = event.key.toLowerCase();
        keys[lower] = true;
        if (lower == 'q') {
            mouseLook = !mouseLook;
            if (mouseLook) {
                document.body.requestPointerLock();
            } else {
                document.exitPointerLock();
            }
        } else if (lower == 'p') {
            const direction = getDirection(mousePos.x, mousePos.y);
            const rayHit = PHYS.castPhysicsRay(WORLD.camera.position, 
                direction.multiplyScalar(200).add(WORLD.camera.position));
            if (rayHit) {
                const shrub = await MODEL.loadModel(rayHit, new THREE.Vector3(.5, .5, .5), 
                        "out/shrub.glb", "out/shrub.png");
                if (shrub) {
                    WORLD.addPhysicsToMesh(shrub, 0);
                }
            }
        }
    });
    
    window.addEventListener('keyup',  event => {
        keys[event.key.toLowerCase()] = false;
    });

    const buttons = document.querySelectorAll('.singleButton');
    buttons.forEach(button => {
        const id = button.getAttribute("control-id");
        if (id) {
            button.addEventListener('pointermove', (event) => {
                keys[id] = true;
                // this stops mobile browsers from redirecting inputs
                if (event.target) {
                    (event.target as Element).releasePointerCapture((event as PointerEvent).pointerId);
                }
            });
            button.addEventListener('pointerenter', () => {
                keys[id] = true;
            });
            button.addEventListener('pointerout', () => {
                keys[id] = false;
            });
        }
    });

    // prevent browser effects
    document.addEventListener("contextmenu", function (e){
        e.preventDefault();
    }, false);

    document.body.onmousedown = function(e) {
        if(e.button == 1) {
            e.preventDefault();
            return false;
        }
    }
}