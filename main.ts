import * as THREE from 'three';

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

const cubes : Array<THREE.Mesh>=[];
for (let i = -5; i < 5; ++i) {
    for (let j = -5; j < 5; ++j) {
        const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        const material = new THREE.MeshBasicMaterial( {color: new THREE.Color().setHSL(.5 + i * 0.1, .85 + j *.1, .5)} );
        const cube = new THREE.Mesh( geometry, material );
        cube.position.x = i*1.2;
        cube.position.z = j*1.2;
        cube.position.y = 0;
        scene.add( cube );
        cubes.push(cube);
    }
}
let needsCamUpdate = false;
function animate() {
    const timestep = clock.getDelta();
    globalTime += timestep;
    if (keys.w || keys.a || keys.s || keys.d) {        
        const forward = new THREE.Vector3(lookDir.x, lookDir.y, lookDir.z);
        const side = new THREE.Vector3(forward.x, forward.y, forward.z);
        side.cross(new THREE.Vector3(0,1,0)).normalize();
        forward.set(side.x, side.y, side.z);
        forward.cross(new THREE.Vector3(0,1,0)).normalize();
        let speed = 1.0 * timestep;
        if (keys.w) {
            camera.position.add(forward.multiplyScalar(-speed));
        }
        if (keys.s) {
            camera.position.add(forward.multiplyScalar(speed));
        }
        if (keys.a) {
            camera.position.add(side.multiplyScalar(-speed));
        }
        if (keys.d) {
            camera.position.add(side.multiplyScalar(speed));
        }
        needsCamUpdate = true;
    }
    if (renderSize.x != window.innerWidth || renderSize.y != window.innerHeight) {
        renderSize = {x: window.innerWidth, y: window.innerHeight}
        camera.aspect = renderSize.x / renderSize.y;
        renderer.setSize( renderSize.x, renderSize.y );      
        needsCamUpdate = true;  
    }
    if (needsCamUpdate) {        
        camera.lookAt(new THREE.Vector3().add(camera.position).add(lookDir));
        camera.updateProjectionMatrix();
    }
    cubes.forEach(cube => {
        //cube.rotation.x = globalTime;
        cube.rotation.y = Math.sin(globalTime * .1);
        cube.position.y = 0.5 * Math.sin((cube.position.x + cube.position.z)* .1 + globalTime );
    });

	renderer.render( scene, camera );
    needsCamUpdate = false;
}
renderer.setAnimationLoop( animate );


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
        needsCamUpdate = true;
    }
    mousePos.set(newPos.x, newPos.y);
});

window.addEventListener('keydown',  event => {
    keys[event.key] = true;
});
  
window.addEventListener('keyup',  event => {
    keys[event.key] = false;
});