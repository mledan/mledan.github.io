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

// Add lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);

// Array to store the 16 parts
const parts = [];
const stlFiles = [
  'models/part1.stl',
  'models/part2.stl',
  // ... list all 16 STL files
];

// Load STL files
const loader = new THREE.STLLoader();
stlFiles.forEach((file, index) => {
  loader.load(file, (geometry) => {
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00, specular: 0x111111, shininess: 200 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `part-${index}`;
    scene.add(mesh);
    parts.push(mesh);
    // Center the geometry for better positioning
    geometry.center();
  }, undefined, (error) => {
    console.error(`Error loading ${file}:`, error);
  });
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
