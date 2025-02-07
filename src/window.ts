import * as THREE from 'three';
import { time } from 'three/tsl';

import * as PHYS from './physics.js'
import * as WORLD from './world.js'

interface Dict<T> {
    [details: string]: T;
}

export const keys : Dict<boolean> = {w:false, a:false, s:false, d:false};
const mousePos = new THREE.Vector2();
let mouseDown = false;
let lookDir: THREE.Vector3;
export const renderSize = new THREE.Vector2(0, 0);

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
    const dir = new THREE.Vector3((x / renderSize.x) * 2 - 1, (1.0 - y/ renderSize.y) * 2 - 1, 0);
    dir.unproject(WORLD.camera);
    dir.sub(WORLD.camera.position);
    dir.normalize();
    console.log({x:x, y:y, dirs:dir});
    return dir;
}

export function initWindow(lookD: THREE.Vector3) {
    lookDir = lookD;

    window.addEventListener('mousedown', event => {
        if (event.button == 1){
            mouseDown = true;
        }
        if (event.button == 0){
            
            const direction = getDirection(event.clientX, event.clientY);
            const rayHit = PHYS.castPhysicsRay(WORLD.camera.position, 
                direction.multiplyScalar(200).add(WORLD.camera.position));
            if (rayHit) {
                WORLD.makeBox(rayHit, new THREE.Vector3(2,2,2), 0, "green");
            }
        }
    });

    window.addEventListener('mouseup', event => {
        if (event.button == 1){
            mouseDown = false;
        }
    });

    window.addEventListener('mousemove', event => {
        const newPos = new THREE.Vector2(event.clientX, event.clientY);
        if (mouseDown) {
            moveLook(newPos.x-mousePos.x, newPos.y-mousePos.y);
        }
        mousePos.copy(newPos);
    });

    window.addEventListener('keydown', event => {
        keys[event.key.toLowerCase()] = true;
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

    document.addEventListener("contextmenu", function (e){
        e.preventDefault();
    }, false);
}