import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

window.addEventListener('DOMContentLoaded', () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdddddd);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDrawing = false;
    let currentLine = null;

    renderer.domElement.addEventListener('pointerdown', (event) => {
        isDrawing = true;
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);

        const points = [intersection.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x000000 });
        currentLine = new THREE.Line(geometry, material);
        scene.add(currentLine);

        if (window.collaborationBridge) {
            window.collaborationBridge.onDrawStart(intersection.x, intersection.y, '#000000', 2);
        }
    });

    renderer.domElement.addEventListener('pointermove', (event) => {
        if (!isDrawing) return;

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);

        const positions = currentLine.geometry.attributes.position.array;
        const newPositions = new Float32Array(positions.length + 3);
        newPositions.set(positions);
        newPositions.set([intersection.x, intersection.y, intersection.z], positions.length);

        currentLine.geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
        currentLine.geometry.attributes.position.needsUpdate = true;

        if (window.collaborationBridge) {
            window.collaborationBridge.onDrawMove(intersection.x, intersection.y);
        }
    });

    renderer.domElement.addEventListener('pointerup', () => {
        isDrawing = false;
        currentLine = null;

        if (window.collaborationBridge) {
            window.collaborationBridge.onDrawEnd();
        }
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

    window.drawingApp = {
        handleRemoteDrawing: (drawData) => {
            const { action, x, y, color, lineWidth } = drawData;

            switch (action) {
                case 'start':
                    const points = [new THREE.Vector3(x, y, 0)];
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const material = new THREE.LineBasicMaterial({ color: color || 0x000000 });
                    currentLine = new THREE.Line(geometry, material);
                    scene.add(currentLine);
                    break;
                case 'move':
                    if (currentLine) {
                        const positions = currentLine.geometry.attributes.position.array;
                        const newPositions = new Float32Array(positions.length + 3);
                        newPositions.set(positions);
                        newPositions.set([x, y, 0], positions.length);

                        currentLine.geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
                        currentLine.geometry.attributes.position.needsUpdate = true;
                    }
                    break;
                case 'end':
                    currentLine = null;
                    break;
            }
        }
    };

    document.getElementById('create-room').addEventListener('click', () => {
        const roomId = window.collaborationBridge.generateRoomId();
        window.collaborationBridge.initialize(roomId);
        window.history.replaceState({}, '', `?room=${roomId}`);
    });

    document.getElementById('join-room').addEventListener('click', () => {
        const roomId = document.getElementById('room-id').value;
        if (roomId) {
            window.collaborationBridge.initialize(roomId);
            window.history.replaceState({}, '', `?room=${roomId}`);
        }
    });

    document.getElementById('copy-link').addEventListener('click', () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            alert('Room link copied to clipboard!');
        });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    if (roomId) {
        window.collaborationBridge.initialize(roomId);
    }
});
