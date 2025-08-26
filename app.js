// Initialize Three.js: Sets up the core components for the 3D scene.
const scene = new THREE.Scene(); // Creates a new scene object to hold all 3D elements.
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); // Defines a perspective camera with field of view, aspect ratio, near/far clipping planes.
camera.position.z = 50; // Positions the camera 50 units away along the z-axis for an initial view.

const renderer = new THREE.WebGLRenderer(); // Creates a WebGL renderer to draw the scene.
renderer.setSize(window.innerWidth, window.innerHeight); // Sets the renderer size to match the window.
document.getElementById('canvas').appendChild(renderer.domElement); // Appends the renderer's DOM element to the HTML element with id 'canvas'.

// Add OrbitControls for rotation/zoom: Enables user interaction like orbiting, zooming, and panning.
const controls = new THREE.OrbitControls(camera, renderer.domElement); // Attaches OrbitControls to the camera and renderer.
controls.enableDamping = true; // Enables smooth damping for more natural movement.

// Initial toggle states: Variables to track toggle button states for orbit, auto-rotate, and auto-slide (initially off).
let orbitEnabled = false;
controls.enabled = false; // Disables controls initially.
let autoRotate = false;
controls.autoRotate = false; // Disables auto-rotation initially.
let autoSlide = false; // Custom flag for sliding animation.

// Add lighting: Adds lights to illuminate the scene and create shading effects.
const ambientLight = new THREE.AmbientLight(0x404040); // Soft gray ambient light for overall illumination.
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // White directional light from above-front for highlights/shadows.
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444); // Hemisphere light simulating sky/ground for natural lighting.
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

// Array to store the 16 parts: An array to hold the loaded 3D meshes from STL files.
const parts = [];
const stlFiles = []; // Array to hold paths to 16 STL files.
for (let i = 1; i <= 16; i++) {
 stlFiles.push(`models/part${i}.stl`); // Populates file paths like 'models/part1.stl' to 'models/part16.stl'.
}

// Load STL files: Uses STLLoader to load each file asynchronously.
const loader = new THREE.STLLoader(); // Instantiates the STL loader.
let loaded = 0; // Counter for loaded files.
stlFiles.forEach((file, index) => {
 loader.load(file, (geometry) => { // Loads the geometry from the STL file.
 console.log(`Loaded STL part ${index + 1}: ${file}`); // Logging: Confirms each part loaded.
 const material = new THREE.MeshStandardMaterial({ color: 0x00ff00, metalness: 0.8, roughness: 0.2 }); // Creates a standard material with green color and metallic properties (initial fallback color).
 const mesh = new THREE.Mesh(geometry, material); // Creates a mesh from the geometry and material.
 mesh.name = `part-${index}`; // Names the mesh for identification.
 scene.add(mesh); // Adds the mesh to the scene.
 parts.push(mesh); // Stores the mesh in the parts array.
 loaded++; // Increments the loaded counter.
 if (loaded === stlFiles.length) { // Once all are loaded...
 console.log('All STL parts loaded. Proceeding to create panels.'); // Logging: All parts ready.
 createPanels(); // Calls function to merge and process panels.
 }
 }, undefined, (error) => {
 console.error(`Error loading ${file}:`, error); // Error handling for loading issues.
 });
});

// Function to detect the dominant normal (flat side) of a geometry: Analyzes triangle normals to find the most common (dominant) face direction for UV projection.
function detectDominantNormal(geometry) {
 const positions = geometry.attributes.position.array; // Gets vertex positions.
 const normals = []; // Array to store computed normals.
 for (let i = 0; i < positions.length / 9; i++) { // Loops over each triangle (9 vertices per triangle).
 const v1 = new THREE.Vector3(positions[i*9], positions[i*9+1], positions[i*9+2]); // Vertex 1.
 const v2 = new THREE.Vector3(positions[i*9+3], positions[i*9+4], positions[i*9+5]); // Vertex 2.
 const v3 = new THREE.Vector3(positions[i*9+6], positions[i*9+7], positions[i*9+8]); // Vertex 3.
 const normal = new THREE.Vector3().crossVectors(v2.clone().sub(v1), v3.clone().sub(v1)).normalize(); // Computes normalized face normal.
 normals.push(normal); // Stores the normal.
 }
 // Group by similar normals: Uses a key-based grouping with epsilon for floating-point comparison.
 const groups = {};
 const epsilon = 0.01; // Tolerance for normal similarity.
 for (let n of normals) {
 const key = n.toArray().map(x => Math.round(x / epsilon) * epsilon).join(','); // Creates a rounded key for grouping.
 if (!groups[key]) groups[key] = {normal: n, count: 0};
 groups[key].count++; // Counts occurrences.
 }
 // Find group with max count: Reduces to the normal with the highest count (dominant flat side).
 let maxGroup = Object.values(groups).reduce((max, g) => g.count > max.count ? g : max, {count: 0});
 console.log('Detected dominant normal:', maxGroup.normal); // Logging: Outputs the detected normal for debugging.
 return maxGroup.normal;
}

// Function to create panels from parts: Merges groups of 4 parts into panels, applies textures, and sets materials.
const groups = []; // Array to store the final panel groups.
function createPanels() {
 const colors = [0xffcccc, 0xccffcc, 0xccccff, 0x000000]; // Enhanced: Pastel light red, green, blue for panels 1-3; black for backing panel 4 (frame-like).
 console.log('Creating panels with colors:', colors); // Logging: Confirms color assignments.
 const targetDate = new Date('2025-08-31T13:10:00'); // Target date for countdown (landing time).
 function calculateCountdown() { // Calculates days left until target date.
 const now = new Date();
 const diff = targetDate - now;
 const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
 console.log(`Calculated countdown: ${days} days`); // Logging: Outputs countdown for verification (should be 6 days as of Aug 25, 2025).
 return `${days} Days until Miljana lands!`;
 }
 const texts = [ // Array of messages for each panel.
 calculateCountdown(), // First: Countdown.
 "I love you Miljana", // Second: Love message.
 "Can't wait to go camping!", // Third: Camping message.
 "ToDos:\n- Folding laundry\n- Wash dishes\n- Buy flowers" // Fourth: Todos.
 ];
 console.log('Panel texts:', texts); // Logging: Confirms texts.

 // Load font for dry erase marker look: Adds a Google Font link for 'Permanent Marker' to simulate dry erase style.
 const fontLink = document.createElement('link');
 fontLink.href = 'https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap';
 fontLink.rel = 'stylesheet';
 document.head.appendChild(fontLink);
 console.log('Loaded dry erase font link.'); // Logging: Confirms font addition.

 for (let i = 0; i < 4; i++) { // Loops over 4 panels.
 const panelGeos = []; // Array for geometries of this panel's parts.
 for (let j = 0; j < 4; j++) { // Groups 4 parts per panel.
 const idx = i * 4 + j;
 const part = parts[idx];
 scene.remove(part); // Removes individual part from scene.
 panelGeos.push(part.geometry); // Collects geometry.
 }

 let merged = new THREE.BufferGeometry(); // Creates a new buffer geometry for merging.
 if (panelGeos.length > 0) {
 merged = new THREE.BufferGeometryUtils.mergeBufferGeometries(panelGeos); // Merges the geometries (requires BufferGeometryUtils).
 console.log(`Merged geometries for panel ${i + 1}`); // Logging: Confirms merge.
 }
 merged.computeBoundingBox(); // Computes bounding box for size calculations.
 console.log(`Panel ${i + 1} bounding box:`, merged.boundingBox); // Logging: Outputs bounding box for size verification.

 // Detect flat side normal: Calls the function to find the dominant face.
 const normal = detectDominantNormal(merged);

 // Create basis for planar projection: Sets up U/V axes perpendicular to the normal for UV mapping.
 let up = new THREE.Vector3(0, 1, 0);
 if (Math.abs(normal.dot(up)) > 0.99) up = new THREE.Vector3(0, 0, 1); // Adjusts if normal is too aligned with Y.
 const u = new THREE.Vector3().crossVectors(normal, up).normalize(); // U axis.
 const v = new THREE.Vector3().crossVectors(normal, u).normalize(); // V axis.

 // Compute min/max for UV scaling: Projects vertices onto U/V to find extents.
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
 const sizeU = maxU - minU || 1; // Size along U (avoids zero).
 const sizeV = maxV - minV || 1; // Size along V.

 // Set UVs: Generates UV coordinates based on projection.
 const uvs = new Float32Array(pos.count * 2);
 for (let k = 0; k < pos.count; k++) {
 const p = new THREE.Vector3(pos.getX(k), pos.getY(k), pos.getZ(k));
 const pu = p.dot(u);
 const pv = p.dot(v);
 uvs[k * 2] = (pu - minU) / sizeU; // UV X.
 uvs[k * 2 + 1] = (pv - minV) / sizeV; // UV Y.
 }
 merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); // Adds UV attribute.
 console.log(`UVs set for panel ${i + 1}`); // Logging: Confirms UV mapping.

 // Create canvas texture with text and fun drawings: Generates a 2D canvas for texture.
 const canvas = document.createElement('canvas');
 canvas.width = 1024; // Canvas width.
 canvas.height = 512; // Canvas height.
 const ctx = canvas.getContext('2d'); // 2D context.
 ctx.fillStyle = 'rgba(255,255,255,0.1)'; // Semi-transparent white background.
 ctx.fillRect(0, 0, canvas.width, canvas.height);
 ctx.fillStyle = (i === 3) ? 'white' : 'black'; // Enhanced: White text for black backing panel, black for others.
 ctx.font = '60px "Permanent Marker"'; // Dry erase font.
 ctx.textAlign = 'center'; // Centers text.
 ctx.textBaseline = 'middle'; // Middle baseline.
 // Split text for multi-line: Draws each line centered.
 const lines = texts[i].split('\n');
 const lineHeight = 70;
 lines.forEach((line, ln) => {
 ctx.fillText(line, canvas.width / 2, (canvas.height / 2) + (ln - (lines.length - 1) / 2) * lineHeight);
 });

 // Add fun dry erase drawings: Custom 2D drawings per panel using canvas context.
 if (i === 0) {
 // Plane landing in Chicago: Draws ground, plane body, tail, and label.
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
 // Hearts for "I love you": Draws two red hearts.
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
 // Tent for camping: Draws orange tent and pole.
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
 // Checkboxes for todos: Draws checkboxes with check marks (white on black).
 ctx.strokeStyle = 'white'; // Enhanced: White for visibility on black.
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

 const texture = new THREE.CanvasTexture(canvas); // Creates texture from canvas.
 texture.needsUpdate = true; // Flags for update.
 console.log(`Texture created for panel ${i + 1}`); // Logging: Confirms texture.

 const material = new THREE.MeshStandardMaterial({ // Creates material with color, metallic effect, and texture.
 color: colors[i], // Applies per-panel color.
 metalness: 0.8, // High metalness for cool metallic look.
 roughness: 0.2, // Low roughness for shine.
 map: texture, // Applies the canvas as a texture map.
 transparent: false, // Enhanced: Set to false for full visibility (no transparency needed).
 opacity: 1 // Full opacity.
 });
 console.log(`Material created for panel ${i + 1} with color ${colors[i].toString(16)}`); // Logging: Confirms material.

 const mesh = new THREE.Mesh(merged, material); // Creates mesh from merged geometry and material.
 const group = new THREE.Group(); // Group to hold the mesh (for potential transformations).
 group.add(mesh);
 scene.add(group); // Adds group to scene.
 groups.push(group); // Stores group.
 console.log(`Panel ${i + 1} added to scene.`); // Logging: Confirms addition.
 }
}

// Animation loop: Renders the scene continuously and handles updates.
let time = 0; // Time variable for animations.
function animate() {
 requestAnimationFrame(animate); // Requests next frame.
 controls.update(); // Updates controls based on user input.

 if (autoSlide) { // If auto-slide enabled...
 time += 0.01; // Increments time.
 groups.forEach((group, i) => {
 group.position.x = Math.sin(time + i * Math.PI / 2) * 10; // Slides panels along X with phase offset for fun movement.
 });
 }

 renderer.render(scene, camera); // Renders the scene.
}
animate(); // Starts the loop.

// Handle window resize: Adjusts camera and renderer on window resize.
window.addEventListener('resize', () => {
 camera.aspect = window.innerWidth / window.innerHeight; // Updates aspect ratio.
 camera.updateProjectionMatrix(); // Updates projection.
 renderer.setSize(window.innerWidth, window.innerHeight); // Resizes renderer.
});

// Add event listeners for buttons: Toggles features via button clicks (assumes HTML buttons with IDs).
document.getElementById('toggleOrbit').addEventListener('click', () => {
 orbitEnabled = !orbitEnabled;
 controls.enabled = orbitEnabled; // Toggles orbit controls.
 console.log(`Orbit toggled: ${orbitEnabled}`); // Logging: Confirms toggle.
});

document.getElementById('toggleAutoRotate').addEventListener('click', () => {
 autoRotate = !autoRotate;
 controls.autoRotate = autoRotate; // Toggles auto-rotation.
 console.log(`Auto-rotate toggled: ${autoRotate}`); // Logging: Confirms toggle.
});

document.getElementById('toggleAutoSlide').addEventListener('click', () => {
 autoSlide = !autoSlide; // Toggles auto-slide.
 console.log(`Auto-slide toggled: ${autoSlide}`); // Logging: Confirms toggle.
});

// Add keyboard shortcuts: Toggles via keypress (o: orbit, r: rotate, a: slide).
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
