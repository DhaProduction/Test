import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, useGLTF, Environment, Grid } from '@react-three/drei';
import * as THREE from 'three';

function makeBone(name: string, position: THREE.Vector3) {
  const b = new THREE.Bone();
  b.name = name;
  b.position.copy(position);
  return b;
}

function bounds(obj: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  return { box, size, center };
}

function buildHumanoid(b: ReturnType<typeof bounds>) {
  const { center, size, box } = b;
  const y = (t: number) => box.min.y + size.y * t;
  const hips = makeBone('Hips', new THREE.Vector3(center.x, y(0.45), center.z));
  const spine = makeBone('Spine', new THREE.Vector3(center.x, y(0.7), center.z));
  const head = makeBone('Head', new THREE.Vector3(center.x, y(0.95), center.z));
  hips.add(spine); spine.add(head);
  return { root: hips, bones: [hips, spine, head] };
}

function buildQuadruped(b: ReturnType<typeof bounds>) {
  const { center, size, box } = b;
  const y = (t:number)=> box.min.y + size.y * t;
  const spine = makeBone('Spine', new THREE.Vector3(center.x, y(0.6), center.z));
  const head = makeBone('Head', new THREE.Vector3(center.x + size.x*0.3, y(0.8), center.z));
  const tail = makeBone('Tail', new THREE.Vector3(center.x - size.x*0.3, y(0.6), center.z));
  spine.add(head); spine.add(tail);
  return { root: spine, bones: [spine, head, tail] };
}

function buildBird(b: ReturnType<typeof bounds>) {
  const { center, size, box } = b;
  const y = (t:number)=> box.min.y + size.y * t;
  const spine = makeBone('Spine', new THREE.Vector3(center.x, y(0.7), center.z));
  const left = makeBone('L_Wing', new THREE.Vector3(center.x+size.x*0.4, y(0.7), center.z));
  const right = makeBone('R_Wing', new THREE.Vector3(center.x-size.x*0.4, y(0.7), center.z));
  spine.add(left); spine.add(right);
  return { root: spine, bones: [spine, left, right] };
}

function buildRobot(b: ReturnType<typeof bounds>) {
  const { center, size } = b;
  const top = makeBone('Top', new THREE.Vector3(center.x, center.y + size.y*0.2, center.z));
  const mid = makeBone('Mid', new THREE.Vector3(center.x, center.y, center.z));
  const bottom = makeBone('Bottom', new THREE.Vector3(center.x, center.y - size.y*0.2, center.z));
  top.add(mid); mid.add(bottom);
  return { root: top, bones: [top, mid, bottom] };
}

function bind(scene: THREE.Object3D, rig: {root:THREE.Bone,bones:THREE.Bone[]}) {
  const skeleton = new THREE.Skeleton(rig.bones);
  scene.traverse(obj => {
    if ((obj as any).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.geometry = mesh.geometry.clone();
      const skinned = new THREE.SkinnedMesh(mesh.geometry, mesh.material as any);
      mesh.visible = false;
      skinned.add(rig.root);
      skinned.bind(skeleton);
      (mesh.parent as THREE.Object3D).add(skinned);
    }
  });
  return skeleton;
}

function GLTFModel({ url, onLoad }:{url:string,onLoad:(scene:THREE.Object3D)=>void}) {
  const gltf = useGLTF(url);
  useEffect(()=>{ onLoad(gltf.scene); },[gltf.scene,onLoad]);
  return <primitive object={gltf.scene} />;
}

function Studio() {
  const [fileUrl, setFileUrl] = useState<string| null>(null);
  const [preset, setPreset] = useState('human');
  const sceneRef = useRef<THREE.Object3D|null>(null);
  const skeletonRef = useRef<THREE.Skeleton|null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFileUrl(URL.createObjectURL(f));
  };

  const autoRig = () => {
    if (!sceneRef.current) return;
    const b = bounds(sceneRef.current);
    let rig;
    switch(preset){
      case 'animal': rig = buildQuadruped(b); break;
      case 'bird': rig = buildBird(b); break;
      case 'robot': rig = buildRobot(b); break;
      default: rig = buildHumanoid(b); break;
    }
    skeletonRef.current = bind(sceneRef.current, rig);
  };

  const exportJSON = () => {
    if (!skeletonRef.current) return;
    const data = skeletonRef.current.bones.map(b=>({name:b.name, position:b.getWorldPosition(new THREE.Vector3())}));
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rig.json';
    a.click();
  };

  return (
    <div className="h-full w-full grid grid-cols-4 gap-4 p-4">
      <div className="col-span-1 space-y-4">
        <input type="file" accept=".glb,.gltf" onChange={onFile} />
        <select value={preset} onChange={e=>setPreset(e.target.value)} className="w-full text-black">
          <option value="human">Umanoide</option>
          <option value="animal">Quadrupede</option>
          <option value="bird">Uccello</option>
          <option value="robot">Robot</option>
        </select>
        <button onClick={autoRig} className="w-full bg-emerald-500 text-black py-1 rounded">AutoRig</button>
        <button onClick={exportJSON} className="w-full bg-zinc-700 py-1 rounded">Export JSON</button>
      </div>
      <div className="col-span-3">
        <Canvas camera={{position:[3,3,3]}}>
          <ambientLight />
          <Suspense fallback={<Html center>Loading…</Html>}>
            {fileUrl && <GLTFModel url={fileUrl} onLoad={s=>{sceneRef.current=s}} />}
            {fileUrl ? null : <Html center>Carica un modello</Html>}
            <Environment preset="city" />
          </Suspense>
          <Grid args={[10,10]} cellSize={0.5} />
          <OrbitControls />
        </Canvas>
      </div>
    </div>
  );
}

function Landing({onStart}:{onStart:()=>void}){
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-zinc-900 to-black text-white">
      <h1 className="text-5xl font-bold">RigForce</h1>
      <button onClick={onStart} className="px-6 py-3 bg-emerald-500 text-black rounded-xl text-lg">Rig now</button>
    </div>
  );
}

export default function App(){
  const [started, setStarted] = useState(false);
  return started ? <Studio /> : <Landing onStart={()=>setStarted(true)} />;
}

