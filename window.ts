import * as THREE from 'three';

interface Dict<T> {
    [details: string]: T;
}

export const keys : Dict<boolean> = {w:false, a:false, s:false, d:false};
const mousePos = new THREE.Vector2();
let mouseDown = false;

export function initWindow(lookDir: THREE.Vector3) {
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
}
