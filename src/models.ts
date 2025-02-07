import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import * as WORLD from './world.js'

const texLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

// blocking model load for simplicity
function modelLoader(url: string) {
    return new Promise((resolve, reject) => {
        gltfLoader.load(url, data=> resolve(data), undefined, reject);
    });
  }

export async function loadModel(postion: THREE.Vector3, scale: THREE.Vector3, modelPath: string, texturePath: string) : Promise<THREE.Object3D<THREE.Object3DEventMap> | undefined> {
    const texture = texLoader.load(texturePath);
    const textureMaterial = new THREE.MeshPhongMaterial({
        map: texture,
    });    
    // need to turn off Y flip to match blender textures
    const colorMap = textureMaterial.map;
    if (colorMap) {
        colorMap.flipY = false;
    }

    let retVal: THREE.Object3D | undefined = undefined;
    const gltf = await modelLoader(modelPath) as GLTF;
    gltf.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
            obj.material = textureMaterial;
            obj.position.copy(postion);
            obj.scale.copy(scale);
            retVal = obj;
        }
    });
    WORLD.scene.add( gltf.scene );

    return retVal;
}
