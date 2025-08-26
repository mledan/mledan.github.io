// Initialize Three.js scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 50; // Position the camera along the z-axis for initial view

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas').appendChild(renderer.domElement); // Append renderer to the DOM element with id 'canvas'

// Add OrbitControls for user interaction (rotation, zoom, pan)
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Enable smooth damping for controls

// Add lighting to the scene for better visibility and shading
const ambientLight = new THREE.AmbientLight(0x404040); // Soft ambient light
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // Directional light for highlights
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444); // Hemisphere light for natural lighting
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

// Array to store the loaded mesh parts
const parts = [];
// Generate array of STL file paths (assuming 16 parts, but only first 4 used for panels)
const stlFiles = Array.from({length: 16}, (_, i) => `models/part${i+1}.stl`);

// Define very pastel almost white colors for panels (red-ish, green-ish, blue-ish, yellow-ish)
const pastelColors = [0xffdddd, 0xddffdd, 0xddddff, 0xffffdd]; // Very light pastel red, green, blue, yellow

// Load STL files using STLLoader
const loader = new THREE.STLLoader();
let loadedCount = 0; // Counter for loaded models
let font = null; // Variable to store loaded font
let partsLoaded = false; // Flag to check if all parts are loaded

stlFiles.forEach((file, index) => {
 loader.load(file, (geometry) => {
 let color;
 if (index < 4) {
 // Panels: very pastel colors
 color = pastelColors[index];
 } else {
 // Frame: black
 color = 0x000000;
 }
 // Create material with metallic effect (high metalness, low roughness)
 const material = new THREE.MeshStandardMaterial({ 
 color: color, 
 metalness: 0.8, 
 roughness: 0.2 
 });
 const mesh = new THREE.Mesh(geometry, material);
 mesh.name = `part-${index}`; // Name the mesh for identification
 scene.add(mesh);
 parts.push(mesh);
 geometry.center(); // Center the geometry for proper positioning
 loadedCount++;
 if (loadedCount === stlFiles.length) {
 partsLoaded = true;
 tryAddTexts(); // Attempt to add texts once all parts are loaded
 }
 }, undefined, (error) => {
 console.error(`Error loading ${file}:`, error);
 });
});

// Load font for creating 3D text geometries
const fontLoader = new THREE.FontLoader();
fontLoader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (loadedFont) => {
 font = loadedFont;
 tryAddTexts(); // Attempt to add texts once font is loaded
});

// Function to add texts and drawings to panels when both font and parts are ready
function tryAddTexts() {
 if (!font || !partsLoaded) return; // Exit if not ready

 // Calculate days until the target date (flight landing)
 const targetDate = new Date(2025, 7, 31, 13, 10, 0); // August 31, 2025, 1:10 PM (month is 0-indexed)
 const now = new Date();
 const timeDiff = targetDate - now;
 const daysLeft = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24))); // Calculate days left, floor to 0 if past

 // Material for text (black, resembling dry erase marker)
 const textMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });

 // Assume parts[0] to parts[3] are the four main panels (top to bottom or as per model)

 // First panel: Countdown text with plane drawing
 const text1Geo = new THREE.TextGeometry(`${daysLeft} Days until Miljana lands!`, {
 font: font,
 size: 3,
 height: 0.2,
 });
 const text1Mesh = new THREE.Mesh(text1Geo, textMaterial);
 text1Mesh.position.set(-10, 5, 1); // Position text on the panel (adjust as needed)
 parts[0].add(text1Mesh);

 // Add a simple 3D plane drawing for landing in Chicago
 const planeGroup = new THREE.Group();
 // Fuselage (cylinder)
 const fuselageGeo = new THREE.CylinderGeometry(0.5, 0.5, 10, 32);
 const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
 const fuselage = new THREE.Mesh(fuselageGeo, whiteMat);
 fuselage.rotation.z = Math.PI / 2; // Rotate to horizontal
 planeGroup.add(fuselage);
 // Wings (box)
 const wingsGeo = new THREE.BoxGeometry(15, 0.2, 3);
 const wings = new THREE.Mesh(wingsGeo, whiteMat);
 planeGroup.add(wings);
 // Scale, position, and rotate the plane group
 planeGroup.scale.set(0.2, 0.2, 0.2);
 planeGroup.position.set(10, 0, 1); // Position on the panel
 planeGroup.rotation.y = Math.PI / 4; // Slight tilt to simulate landing
 parts[0].add(planeGroup);

 // Second panel: Love message
 const text2Geo = new THREE.TextGeometry('I love you Miljana', {
 font: font,
 size: 3,
 height: 0.2,
 });
 const text2Mesh = new THREE.Mesh(text2Geo, textMaterial);
 text2Mesh.position.set(0, 0, 1); // Center on panel
 parts[1].add(text2Mesh);

 // Third panel: Camping excitement
 const text3Geo = new THREE.TextGeometry("Can't wait to go camping!", {
 font: font,
 size: 3,
 height: 0.2,
 });
 const text3Mesh = new THREE.Mesh(text3Geo, textMaterial);
 text3Mesh.position.set(0, 0, 1); // Center on panel
 parts[2].add(text3Mesh);

 // Fourth panel: Random todos (multiline text)
 const text4Geo = new THREE.TextGeometry("Todos:\n- Fold laundry\n- Clean room\n- Buy flowers\n- Prepare surprise", {
 font: font,
 size: 2.5,
 height: 0.2,
 });
 const text4Mesh = new THREE.Mesh(text4Geo, textMaterial);
 text4Mesh.position.set(0, 0, 1); // Center on panel
 parts[3].add(text4Mesh);
}

// Animation loop to render the scene continuously
function animate() {
 requestAnimationFrame(animate); // Request next frame
 controls.update(); // Update controls for interaction
 renderer.render(scene, camera); // Render the scene
}
animate(); // Start the animation loop

// Handle window resize to maintain aspect ratio
window.addEventListener('resize', () => {
 camera.aspect = window.innerWidth / window.innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize(window.innerWidth, window.innerHeight);
});
