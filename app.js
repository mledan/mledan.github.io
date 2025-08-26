// Initialize Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 50;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas').appendChild(renderer.domElement);

// Add OrbitControls for rotation/zoom
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Initial toggle states (based on description: OFF)
let orbitEnabled = false;
controls.enabled = false;
let autoRotate = false;
controls.autoRotate = false;
let autoSlide = false;

// Add lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

// Array to store the 16 parts
const parts = [];
const stlFiles = [];
for (let i = 1; i <= 16; i++) {
  stlFiles.push(`models/part${i}.stl`);
}

// Load STL files
const loader = new THREE.STLLoader();
let loaded = 0;
stlFiles.forEach((file, index) => {
  loader.load(file, (geometry) => {
    console.log(`Loaded STL part ${index + 1}: ${file}`);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00, metalness: 0.8, roughness: 0.2 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `part-${index}`;
    scene.add(mesh);
    parts.push(mesh);
    loaded++;
    if (loaded === stlFiles.length) {
      console.log('All STL parts loaded. Proceeding to create panels.');
      createPanels();
    }
  }, undefined, (error) => {
    console.error(`Error loading ${file}:`, error);
  });
});

// Function to detect the dominant normal (flat side) of a geometry
function detectDominantNormal(geometry) {
  const positions = geometry.attributes.position.array;
  const normals = [];
  for (let i = 0; i < positions.length / 9; i++) { // each triangle
    const v1 = new THREE.Vector3(positions[i*9], positions[i*9+1], positions[i*9+2]);
    const v2 = new THREE.Vector3(positions[i*9+3], positions[i*9+4], positions[i*9+5]);
    const v3 = new THREE.Vector3(positions[i*9+6], positions[i*9+7], positions[i*9+8]);
    const normal = new THREE.Vector3().crossVectors(v2.clone().sub(v1), v3.clone().sub(v1)).normalize();
    normals.push(normal);
  }
  // Group by similar normals
  const groups = {};
  const epsilon = 0.01;
  for (let n of normals) {
    const key = n.toArray().map(x => Math.round(x / epsilon) * epsilon).join(',');
    if (!groups[key]) groups[key] = {normal: n, count: 0};
    groups[key].count++;
  }
  // Find group with max count
  let maxGroup = Object.values(groups).reduce((max, g) => g.count > max.count ? g : max, {count: 0});
  console.log('Detected dominant normal:', maxGroup.normal);
  return maxGroup.normal;
}

// Function to create panels from parts
const groups = [];
function createPanels() {
  const colors = [0xffcccc, 0xccffcc, 0xccccff, 0x000000]; // Pastel light red, green, blue; black for backing
  console.log('Creating panels with colors:', colors);
  const targetDate = new Date('2025-08-31T13:10:00');
  function calculateCountdown() {
    const now = new Date();
    const diff = targetDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    console.log(`Calculated countdown: ${days} days`);
    return `${days} Days until Miljana lands!`;
  }
  const texts = [
    calculateCountdown(),
    "I love you Miljana",
    "Can't wait to go camping!",
    "ToDos:\n- Folding laundry\n- Wash dishes\n- Buy flowers"
  ];
  console.log('Panel texts:', texts);

  // Load font for dry erase marker look
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);
  console.log('Loaded dry erase font link.');

  for (let i = 0; i < 4; i++) {
    const panelGeos = [];
    for (let j = 0; j < 4; j++) {
      const idx = i * 4 + j;
      const part = parts[idx];
      scene.remove(part);
      panelGeos.push(part.geometry);
    }

    let merged = new THREE.BufferGeometry();
    if (panelGeos.length > 0) {
      merged = new THREE.BufferGeometryUtils.mergeBufferGeometries(panelGeos);
      console.log(`Merged geometries for panel ${i + 1}`);
    }
    merged.computeBoundingBox();
    console.log(`Panel ${i + 1} bounding box:`, merged.boundingBox);

    const normal = detectDominantNormal(merged);

    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(normal.dot(up)) > 0.99) up = new THREE.Vector3(0, 0, 1);
    const u = new THREE.Vector3().crossVectors(normal, up).normalize();
    const v = new THREE.Vector3().crossVectors(normal, u).normalize();

    const pos = merged.attributes.position;
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (let k = 0; k < pos.count; k++) {
      const p = new THREE.Vector3(pos.getX(k), pos.getY(k), pos.getZ(k));
      const pu = p.dot(u);
      const pv = p.dot(v);
      minU = Math.min(minU, pu);
      maxU = Math.max(maxU, pu);
      minV = Math.min(minV, pv);
      maxV = Math.max(maxV, pv);
    }
    const sizeU = maxU - minU || 1;
    const sizeV = maxV - minV || 1;

    const uvs = new Float32Array(pos.count * 2);
    for (let k = 0; k < pos.count; k++) {
      const p = new THREE.Vector3(pos.getX(k), pos.getY(k), pos.getZ(k));
      const pu = p.dot(u);
      const pv = p.dot(v);
      uvs[k * 2] = (pu - minU) / sizeU;
      uvs[k * 2 + 1] = (pv - minV) / sizeV;
    }
    merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    console.log(`UVs set for panel ${i + 1}`);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = (i === 3) ? 'white' : 'black';
    ctx.font = '60px "Permanent Marker"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = texts[i].split('\n');
    const lineHeight = 70;
    lines.forEach((line, ln) => {
      ctx.fillText(line, canvas.width / 2, (canvas.height / 2) + (ln - (lines.length - 1) / 2) * lineHeight);
    });

    if (i === 0) {
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(700, 450);
      ctx.lineTo(1000, 450);
      ctx.stroke();

      ctx.fillStyle = 'gray';
      ctx.beginPath();
      ctx.moveTo(850, 400);
      ctx.lineTo(950, 420);
      ctx.lineTo(900, 380);
      ctx.lineTo(850, 400);
      ctx.lineTo(900, 440);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(850, 400);
      ctx.lineTo(800, 390);
      ctx.lineTo(820, 370);
      ctx.lineTo(800, 390);
      ctx.lineTo(820, 410);
      ctx.fill();

      ctx.font = '40px "Permanent Marker"';
      ctx.fillText("Chicago", 850, 490);
    } else if (i === 1) {
      ctx.fillStyle = 'red';
      const heartSize = 50;
      const drawHeart = (x, y) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + heartSize / 2, y - heartSize / 2, x + heartSize, y + heartSize / 3, x, y + heartSize);
        ctx.bezierCurveTo(x - heartSize, y + heartSize / 3, x - heartSize / 2, y - heartSize / 2, x, y);
        ctx.fill();
      };
      drawHeart(200, 400);
      drawHeart(800, 400);
    } else if (i === 2) {
      ctx.fillStyle = 'orange';
      ctx.beginPath();
      ctx.moveTo(800, 400);
      ctx.lineTo(900, 450);
      ctx.lineTo(700, 450);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(800, 400);
      ctx.lineTo(800, 300);
      ctx.stroke();
    } else if (i === 3) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      const checkSize = 30;
      const drawCheckbox = (x, y) => {
        ctx.strokeRect(x, y, checkSize, checkSize);
        ctx.beginPath();
        ctx.moveTo(x + 5, y + checkSize / 2);
        ctx.lineTo(x + checkSize / 2, y + checkSize - 5);
        ctx.lineTo(x + checkSize - 5, y + 5);
        ctx.stroke();
      };
      drawCheckbox(100, 200);
      drawCheckbox(100, 300);
      drawCheckbox(100, 400);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    console.log(`Texture created for panel ${i + 1}`);

    const material = new THREE.MeshStandardMaterial({
      color: colors[i],
      metalness: 0.8,
      roughness: 0.2,
      map: texture,
      transparent: false,
      opacity: 1
    });
    console.log(`Material created for panel ${i + 1} with color ${colors[i].toString(16)}`);

    const mesh = new THREE.Mesh(merged, material);
    const group = new THREE.Group();
    group.add(mesh);
    scene.add(group);
    groups.push(group);
    console.log(`Panel ${i + 1} added to scene.`);
  }
}

// Animation loop
let time = 0;
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  if (autoSlide) {
    time += 0.01;
    groups.forEach((group, i) => {
      group.position.x = Math.sin(time + i * Math.PI / 2) * 10;
    });
  }

  renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Add event listeners for buttons (assuming button IDs match)
document.getElementById('toggleOrbit').addEventListener('click', () => {
  orbitEnabled = !orbitEnabled;
  controls.enabled = orbitEnabled;
  console.log(`Orbit toggled: ${orbitEnabled}`);
});

document.getElementById('toggleAutoRotate').addEventListener('click', () => {
  autoRotate = !autoRotate;
  controls.autoRotate = autoRotate;
  console.log(`Auto-rotate toggled: ${autoRotate}`);
});

document.getElementById('toggleAutoSlide').addEventListener('click', () => {
  autoSlide = !autoSlide;
  console.log(`Auto-slide toggled: ${autoSlide}`);
});

// Add keyboard shortcuts
window.addEventListener('keypress', (e) => {
  if (e.key === 'o') {
    orbitEnabled = !orbitEnabled;
    controls.enabled = orbitEnabled;
    console.log(`Orbit toggled via key: ${orbitEnabled}`);
  } else if (e.key === 'r') {
    autoRotate = !autoRotate;
    controls.autoRotate = autoRotate;
    console.log(`Auto-rotate toggled via key: ${autoRotate}`);
  } else if (e.key === 'a') {
    autoSlide = !autoSlide;
    console.log(`Auto-slide toggled via key: ${autoSlide}`);
  }
});
