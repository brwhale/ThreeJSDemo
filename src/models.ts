import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const texLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

function loadModel(scene: THREE.Scene, modelPath: string, texturePath: string) {
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
//loadModel('Workbench.glb', 'DefaultBumpmap.png');