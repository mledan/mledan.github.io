import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'; // Fixed import

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdddddd);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 0, 250);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas').appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enabled = false;
let isAutorotating = false;
let isAutoSliding = true;
let startTime = performance.now() / 1000;

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

// STL files
const stlFiles = [];
for (let i = 1; i <= 16; i++) stlFiles.push(`models/part${i}.stl`);
stlFiles.push('./completeframe-nosliders.stl');
const parts = [];
const groups = [];
let frameBounds = null;
let loaded = 0;
const loader = new STLLoader();

// Detect dominant normal
function detectDominantNormal(geometry) {
    if (!geometry.attributes.position) {
        console.warn('Geometry has no position attribute');
        return new THREE.Vector3(0, 0, 1); // Fallback normal
    }
    const positions = geometry.attributes.position.array;
    const normals = [];
    for (let i = 0; i < positions.length / 9; i++) {
        const v1 = new THREE.Vector3(positions[i*9], positions[i*9+1], positions[i*9+2]);
        const v2 = new THREE.Vector3(positions[i*9+3], positions[i*9+4], positions[i*9+5]);
        const v3 = new THREE.Vector3(positions[i*9+6], positions[i*9+7], positions[i*9+8]);
        const normal = new THREE.Vector3().crossVectors(v2.clone().sub(v1), v3.clone().sub(v1)).normalize();
        normals.push(normal);
    }
    const groups = {};
    const epsilon = 0.01;
    for (let n of normals) {
        const key = n.toArray().map(x => Math.round(x / epsilon) * epsilon).join(',');
        if (!groups[key]) groups[key] = {normal: n, count: 0};
        groups[key].count++;
    }
    return Object.values(groups).reduce((max, g) => g.count > max.count ? g : max, {count: 0}).normal;
}

// Countdown
const targetDate = new Date('2025-08-31T13:10:00');
let lastDays = null;
function calculateCountdown() {
    const now = new Date();
    const diff = targetDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return `${days} Days until Miljana lands!`;
}

// Create panels
const canvases = [];
function createPanels() {
    const colors = [0xff9999, 0x99ff99, 0x9999ff, 0x000000]; // Pastel red, green, blue; black frame
    const texts = [
        calculateCountdown(),
        "I love you Miljana",
        "Can't wait to go camping!",
        "ToDos:\n- Folding laundry\n- Wash dishes\n- Buy flowers"
    ];

    for (let i = 0; i < 4; i++) {
        const panelGeos = [];
        for (let j = 0; j < 4; j++) {
            const idx = i * 4 + j;
            if (parts[idx]) {
                scene.remove(parts[idx]);
                panelGeos.push(parts[idx].geometry);
            } else {
                console.warn(`Part ${idx} not loaded`);
            }
        }

        const merged = panelGeos.length ? BufferGeometryUtils.mergeBufferGeometries(panelGeos) : new THREE.BufferGeometry();
        merged.computeBoundingBox();

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
            uvs[k * 2] = (p.dot(u) - minU) / sizeU;
            uvs[k * 2 + 1] = (p.dot(v) - minV) / sizeV;
        }
        merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        canvases.push(canvas);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = i === 3 ? 'white' : 'black';
        ctx.font = '60px "Permanent Marker"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lines = texts[i].split('\n');
        const lineHeight = 70;
        lines.forEach((line, ln) => {
            ctx.fillText(line, canvas.width / 2, (canvas.height / 2) + (ln - (lines.length - 1) / 2) * lineHeight);
        });

        // Graphics
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
        const material = new THREE.MeshStandardMaterial({
            color: colors[i],
            metalness: 0.8,
            roughness: 0.2,
            map: texture,
            transparent: false
        });
        const mesh = new THREE.Mesh(merged, material);
        const group = new THREE.Group();
        group.add(mesh);
        group.userData = { movable: true, index: i };
        scene.add(group);
        groups.push(group);
    }

    // Frame
    if (parts[16]) {
        const frameGeo = parts[16].geometry;
        frameGeo.computeBoundingBox();
        frameBounds = frameGeo.boundingBox.clone();
        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const frameMesh = new THREE.Mesh(frameGeo, frameMaterial);
        frameMesh.userData = { movable: false };
        scene.add(frameMesh);
        console.log('Frame added with bounds:', frameBounds.min.toArray(), frameBounds.max.toArray());
    } else {
        console.warn('Frame STL not loaded');
    }
}

// Load STLs
stlFiles.forEach((file, index) => {
    loader.load(file, (geometry) => {
        geometry.computeBoundingBox();
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `part-${index}`;
        scene.add(mesh);
        parts.push(mesh);
        loaded++;
        console.log(`Loaded STL ${index + 1}/${stlFiles.length}: ${file}`);
        if (loaded === stlFiles.length) {
            console.log('All STLs loaded');
            createPanels();
        }
    }, (xhr) => {
        console.log(`${file}: ${(xhr.loaded / xhr.total * 100).toFixed(2)}% loaded`);
    }, (error) => {
        console.error(`Error loading ${file}:`, error);
    });
});

// Mouse interaction
let selectedMesh = null;
let startPoint = null;
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
function onMouseDown(event) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(groups);
    if (intersects.length > 0) {
        selectedMesh = intersects[0].object.parent;
        controls.enabled = false;
        isAutoSliding = false;
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshBasicMaterial());
        const intersectPoint = raycaster.intersectObject(plane)[0]?.point;
        if (intersectPoint) startPoint = intersectPoint.clone();
        console.log(`Dragging started for panel ${selectedMesh.userData.index}`);
    }
}
function onMouseMove(event) {
    if (selectedMesh && frameBounds) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshBasicMaterial());
        const intersectPoint = raycaster.intersectObject(plane)[0]?.point;
        if (intersectPoint) {
            const delta = intersectPoint.sub(startPoint);
            let newPosX = selectedMesh.position.x + delta.x;
            let newPosY = selectedMesh.position.y + delta.y;
            const margin = 0.1;
            newPosX = Math.max(frameBounds.min.x + margin, Math.min(frameBounds.max.x - margin, newPosX));
            newPosY = Math.max(frameBounds.min.y + margin, Math.min(frameBounds.max.y - margin, newPosY));
            selectedMesh.position.set(newPosX, newPosY, selectedMesh.position.z);
            startPoint.copy(intersectPoint);
            console.log(`Moved panel ${selectedMesh.userData.index} to [x=${newPosX}, y=${newPosY}, z=${selectedMesh.position.z}]`);
        }
    }
}
function onMouseUp() {
    if (selectedMesh) console.log(`Dragging ended for panel ${selectedMesh.userData.index}`);
    selectedMesh = null;
    startPoint = null;
}
renderer.domElement.addEventListener('mousedown', onMouseDown);
renderer.domElement.addEventListener('mousemove', onMouseMove);
renderer.domElement.addEventListener('mouseup', onMouseUp);

// Controls
document.getElementById('mobile-toggle-orbit').addEventListener('click', () => {
    controls.enabled = !controls.enabled;
    updateModeIndicator();
    console.log(`Orbit controls: ${controls.enabled ? 'ON' : 'OFF'}`);
});
document.getElementById('mobile-toggle-autorotate').addEventListener('click', () => {
    isAutorotating = !isAutorotating;
    updateModeIndicator();
    console.log(`Autorotate: ${isAutorotating ? 'ON' : 'OFF'}`);
});
document.getElementById('mobile-toggle-autoslide').addEventListener('click', () => {
    isAutoSliding = !isAutoSliding;
    if (isAutoSliding) startTime = performance.now() / 1000;
    updateModeIndicator();
    console.log(`AutoSlide: ${isAutoSliding ? 'ON' : 'OFF'}`);
});
document.getElementById('toggle-autorotate').addEventListener('click', () => {
    isAutorotating = !isAutorotating;
    updateModeIndicator();
    console.log(`Autorotate: ${isAutorotating ? 'ON' : 'OFF'}`);
});
document.getElementById('toggle-autoslide').addEventListener('click', () => {
    isAutoSliding = !isAutoSliding;
    if (isAutoSliding) startTime = performance.now() / 1000;
    updateModeIndicator();
    console.log(`AutoSlide: ${isAutoSliding ? 'ON' : 'OFF'}`);
});
document.getElementById('reset-camera').addEventListener('click', () => {
    camera.position.set(0, 0, 250);
    controls.target.set(0, 0, 0);
    camera.fov = 75;
    camera.updateProjectionMatrix();
    controls.update();
    updateModeIndicator();
    console.log('Camera reset');
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'o') {
        controls.enabled = !controls.enabled;
        updateModeIndicator();
        console.log(`Orbit controls: ${controls.enabled ? 'ON' : 'OFF'}`);
    } else if (e.key === 'r') {
        isAutorotating = !isAutorotating;
        updateModeIndicator();
        console.log(`Autorotate: ${isAutorotating ? 'ON' : 'OFF'}`);
    } else if (e.key === 'a') {
        isAutoSliding = !isAutoSliding;
        if (isAutoSliding) startTime = performance.now() / 1000;
        updateModeIndicator();
        console.log(`AutoSlide: ${isAutoSliding ? 'ON' : 'OFF'}`);
    }
});

function updateModeIndicator() {
    document.getElementById('info').innerHTML = `Click/drag to slide boards. Keys: 'o' (orbit), 'r' (autorotate), 'a' (autoslide). Orbit: ${controls.enabled ? 'ON' : 'OFF'}, AutoRotate: ${isAutorotating ? 'ON' : 'OFF'}, AutoSlide: ${isAutoSliding ? 'ON' : 'OFF'}`;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    if (isAutorotating) scene.rotation.y += 0.01;
    if (isAutoSliding) {
        const time = performance.now() / 1000 - startTime;
        groups.forEach((group, i) => {
            const phase = i * Math.PI / 2;
            let newPosX = Math.sin(time + phase) * 10;
            let newPosZ = 500 + Math.sin(time + phase) * 100;
            if (frameBounds) {
                newPosX = Math.max(frameBounds.min.x, Math.min(frameBounds.max.x, newPosX));
                newPosZ = Math.max(frameBounds.min.z, Math.min(frameBounds.max.z, newPosZ));
            }
            group.position.set(newPosX, 0, newPosZ);
        });
    }

    // Dynamic countdown
    const currentDays = Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24));
    if (currentDays !== lastDays) {
        lastDays = currentDays;
        const ctx = canvases[0].getContext('2d');
        ctx.clearRect(0, 0, canvases[0].width, canvases[0].height);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(0, 0, canvases[0].width, canvases[0].height);
        ctx.fillStyle = 'black';
        ctx.font = '60px "Permanent Marker"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(calculateCountdown(), canvases[0].width / 2, canvases[0].height / 2);
        groups[0].children[0].material.map.needsUpdate = true;
        console.log(`Updated countdown: ${calculateCountdown()}`);
    }

    // Update overlay
    document.getElementById('overlay').innerHTML = calculateCountdown();

    controls.update();
    renderer.render(scene, camera);
}
animate();

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    console.log(`Window resized to ${window.innerWidth}x${window.innerHeight}`);
});
