// Basic Three.js setup
const canvas = document.getElementById('viewer');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeeeeee);

const grid = new THREE.GridHelper(10, 10);
scene.add(grid);

const axes = new THREE.AxesHelper(5);
scene.add(axes);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 3);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const light = new THREE.HemisphereLight(0xffffff, 0x444444);
light.position.set(0, 20, 0);
scene.add(light);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

let model = null;
const gltfLoader = new THREE.GLTFLoader();
const objLoader = new THREE.OBJLoader();
const fbxLoader = new THREE.FBXLoader();

// Handle model loading
const modelInput = document.getElementById('modelInput');
modelInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const ext = file.name.split('.').pop().toLowerCase();
  const onLoad = (obj) => {
    if (model) scene.remove(model);
    model = obj.scene || obj;
    scene.add(model);
    URL.revokeObjectURL(url);
    if (rigMode.value !== 'manual') autoRig(rigMode.value);
  };
  if (ext === 'gltf' || ext === 'glb') {
    gltfLoader.load(url, (gltf) => onLoad(gltf.scene));
  } else if (ext === 'obj') {
    objLoader.load(url, onLoad);
  } else if (ext === 'fbx') {
    fbxLoader.load(url, onLoad);
  } else {
    alert('Formato non supportato');
  }
});

const skeletonGroup = new THREE.Group();
scene.add(skeletonGroup);

const rigMode = document.getElementById('rigMode');
rigMode.addEventListener('change', () => {
  skeletonGroup.clear();
  if (rigMode.value === 'manual') {
    alert('Modalità manuale: clicca sulla mesh per aggiungere joint.');
  } else {
    autoRig(rigMode.value);
  }
});

// Simple autorigging based on model bounding box
function autoRig(mode) {
  if (!model) {
    alert('Carica un modello prima di eseguire l\'autorig.');
    return;
  }
  const bbox = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  const root = new THREE.Bone();
  root.position.set(center.x, bbox.min.y, center.z);

  const templates = {
    human: [
      ['spine', 'root', { x: 0, y: 0.5, z: 0 }],
      ['head', 'spine', { x: 0, y: 0.5, z: 0 }],
      ['leftArm', 'spine', { x: -0.35, y: 0.3, z: 0 }],
      ['rightArm', 'spine', { x: 0.35, y: 0.3, z: 0 }],
      ['leftLeg', 'root', { x: -0.15, y: -0.5, z: 0 }],
      ['rightLeg', 'root', { x: 0.15, y: -0.5, z: 0 }]
    ],
    animal: [
      ['spine', 'root', { x: 0, y: 0.6, z: 0 }],
      ['neck', 'spine', { x: 0, y: 0.3, z: 0.1 }],
      ['head', 'neck', { x: 0, y: 0.2, z: 0.2 }],
      ['tail', 'root', { x: 0, y: 0, z: -0.5 }],
      ['frontLeftLeg', 'spine', { x: -0.3, y: -0.4, z: 0.2 }],
      ['frontRightLeg', 'spine', { x: 0.3, y: -0.4, z: 0.2 }],
      ['backLeftLeg', 'root', { x: -0.3, y: -0.4, z: -0.2 }],
      ['backRightLeg', 'root', { x: 0.3, y: -0.4, z: -0.2 }]
    ],
    bird: [
      ['spine', 'root', { x: 0, y: 0.7, z: 0 }],
      ['head', 'spine', { x: 0, y: 0.3, z: 0.1 }],
      ['leftWing', 'spine', { x: -0.5, y: 0.2, z: 0 }],
      ['rightWing', 'spine', { x: 0.5, y: 0.2, z: 0 }],
      ['leftLeg', 'root', { x: -0.2, y: -0.5, z: 0 }],
      ['rightLeg', 'root', { x: 0.2, y: -0.5, z: 0 }]
    ],
    robot: [
      ['spine', 'root', { x: 0, y: 0.6, z: 0 }],
      ['head', 'spine', { x: 0, y: 0.4, z: 0 }],
      ['leftArm', 'spine', { x: -0.4, y: 0.3, z: 0 }],
      ['rightArm', 'spine', { x: 0.4, y: 0.3, z: 0 }],
      ['leftLeg', 'root', { x: -0.2, y: -0.6, z: 0 }],
      ['rightLeg', 'root', { x: 0.2, y: -0.6, z: 0 }]
    ]
  };

  const boneMap = { root };
  function create(name, parentName, offset) {
    const bone = new THREE.Bone();
    bone.position.set(offset.x * size.x, offset.y * size.y, offset.z * size.z);
    boneMap[parentName].add(bone);
    boneMap[name] = bone;
  }

  (templates[mode] || []).forEach(([name, parent, pos]) => create(name, parent, pos));

  const helper = new THREE.SkeletonHelper(root);
  skeletonGroup.add(helper);
}

// Manual joint placement
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
function onClick(event) {
  if (rigMode.value !== 'manual') return;
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(model ? [model] : [], true);
  if (intersects.length > 0) {
    const point = intersects[0].point;
    const joint = new THREE.Bone();
    joint.position.copy(point);
    const helper = new THREE.SkeletonHelper(joint);
    skeletonGroup.add(helper);
  }
}
renderer.domElement.addEventListener('click', onClick);

// Export rig as JSON
const exportBtn = document.getElementById('exportBtn');
exportBtn.addEventListener('click', () => {
  const data = [];
  skeletonGroup.children.forEach((h) => {
    h.bones.forEach((b) => {
      const pos = new THREE.Vector3();
      b.getWorldPosition(pos);
      data.push(pos.toArray());
    });
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'rig.json';
  link.click();
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
