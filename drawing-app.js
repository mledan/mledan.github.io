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
    let currentStroke = null;
    const strokes = [];
    const strokePropertiesFactory = new StrokePropertiesFactory();
    const quadtree = new Quadtree({
        x: -window.innerWidth / 2,
        y: -window.innerHeight / 2,
        width: window.innerWidth,
        height: window.innerHeight
    });

    renderer.domElement.addEventListener('pointerdown', (event) => {
        isDrawing = true;
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);

        // Use brush engine properties if available
        const brushProps = window.brushEngine ? window.brushEngine.getBrushProperties() : null;
        const color = brushProps ? brushProps.color : '#000000';
        const width = brushProps ? brushProps.width : 2;
        const opacity = brushProps ? brushProps.opacity : 1;
        
        const properties = strokePropertiesFactory.get(color, width);
        properties.opacity = opacity;
        properties.effects = brushProps ? brushProps.effects : [];
        
        currentStroke = {
            points: [intersection.clone()],
            properties: properties
        };
        strokes.push(currentStroke);

        const geometry = new THREE.BufferGeometry().setFromPoints(currentStroke.points);
        
        // Create material with brush properties
        const material = new THREE.LineBasicMaterial({ 
            color: currentStroke.properties.color,
            opacity: currentStroke.properties.opacity || 1,
            transparent: currentStroke.properties.opacity < 1,
            linewidth: currentStroke.properties.width || 1
        });
        
        const line = new THREE.Line(geometry, material);
        
        // Apply special effects
        if (currentStroke.properties.effects && currentStroke.properties.effects.includes('glow')) {
            // Add glow effect using emissive properties
            if (material.emissive) {
                material.emissive = new THREE.Color(currentStroke.properties.color);
                material.emissiveIntensity = 0.5;
            }
        }
        
        scene.add(line);
        currentStroke.line = line;

        const simplifiedPoints = simplifyDouglasPeucker(currentStroke.points, 5);
        const simplifiedGeometry = new THREE.BufferGeometry().setFromPoints(simplifiedPoints);
        const simplifiedLine = new THREE.Line(simplifiedGeometry, material);
        scene.add(simplifiedLine);
        currentStroke.simplifiedLine = simplifiedLine;
        currentStroke.simplifiedPoints = simplifiedPoints;

        const boundingBox = new THREE.Box3().setFromObject(line);
        quadtree.insert({
            x: boundingBox.min.x,
            y: boundingBox.min.y,
            width: boundingBox.max.x - boundingBox.min.x,
            height: boundingBox.max.y - boundingBox.min.y,
            stroke: currentStroke
        });

        if (window.collaborationBridge) {
            const brushState = window.brushEngine ? window.brushEngine.getCurrentBrushState() : null;
            window.collaborationBridge.onDrawStart(
                intersection.x, 
                intersection.y, 
                brushState ? brushState.properties.color : '#000000', 
                brushState ? brushState.properties.width : 2
            );
        }
    });

    renderer.domElement.addEventListener('pointermove', (event) => {
        if (!isDrawing || !currentStroke) return;

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);

        currentStroke.points.push(intersection.clone());
        currentStroke.line.geometry.setFromPoints(currentStroke.points);

        if (window.collaborationBridge) {
            window.collaborationBridge.onDrawMove(intersection.x, intersection.y);
        }
    });

    renderer.domElement.addEventListener('pointerup', () => {
        isDrawing = false;
        currentStroke = null;

        if (window.collaborationBridge) {
            const simplifiedPoints = simplifyDouglasPeucker(strokes[strokes.length - 1].points, 1);
            strokes[strokes.length - 1].points = simplifiedPoints;
            strokes[strokes.length - 1].line.geometry.setFromPoints(simplifiedPoints);
            window.collaborationBridge.onDrawEnd(simplifiedPoints);
        }
    });

    function animate() {
        requestAnimationFrame(animate);
        controls.update();

        const viewBounds = {
            x: camera.position.x - (window.innerWidth / 2 / camera.zoom),
            y: camera.position.y - (window.innerHeight / 2 / camera.zoom),
            width: window.innerWidth / camera.zoom,
            height: window.innerHeight / camera.zoom
        };

        strokes.forEach(stroke => {
            stroke.line.visible = false;
        });

        const visibleStrokes = quadtree.retrieve(viewBounds);
        visibleStrokes.forEach(item => {
            const distance = camera.position.distanceTo(item.stroke.line.position);
            if (distance > 500) {
                item.stroke.line.visible = false;
                item.stroke.simplifiedLine.visible = true;
            } else {
                item.stroke.line.visible = true;
                item.stroke.simplifiedLine.visible = false;
            }
        });

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const remoteStrokes = {};

    // Store strokes for undo/redo functionality
    let strokeHistory = [];
    let redoHistory = [];
    
    window.drawingApp = {
        clearCanvas: () => {
            // Remove all strokes from the scene
            strokes.forEach(stroke => {
                if (stroke.line) scene.remove(stroke.line);
                if (stroke.simplifiedLine) scene.remove(stroke.simplifiedLine);
            });
            strokes.length = 0;
            strokeHistory.length = 0;
            redoHistory.length = 0;
            quadtree.clear();
        },
        
        undo: () => {
            if (strokes.length > 0) {
                const lastStroke = strokes.pop();
                if (lastStroke.line) scene.remove(lastStroke.line);
                if (lastStroke.simplifiedLine) scene.remove(lastStroke.simplifiedLine);
                redoHistory.push(lastStroke);
            }
        },
        
        redo: () => {
            if (redoHistory.length > 0) {
                const stroke = redoHistory.pop();
                if (stroke.line) scene.add(stroke.line);
                if (stroke.simplifiedLine) scene.add(stroke.simplifiedLine);
                strokes.push(stroke);
            }
        },
        
        handleRemoteDrawing: (drawData, userId) => {
            const { action, x, y, color, lineWidth, points } = drawData;

            let stroke = remoteStrokes[userId];

            switch (action) {
                case 'start':
                    const properties = strokePropertiesFactory.get(color, lineWidth);
                    stroke = {
                        points: [new THREE.Vector3(x, y, 0)],
                        properties: properties,
                    };
                    remoteStrokes[userId] = stroke;

                    const geometry = new THREE.BufferGeometry().setFromPoints(stroke.points);
                    const material = new THREE.LineBasicMaterial({ color: stroke.properties.color });
                    const line = new THREE.Line(geometry, material);
                    scene.add(line);
                    stroke.line = line;
                    break;
                case 'move':
                    if (stroke) {
                        stroke.points.push(new THREE.Vector3(x, y, 0));
                        stroke.line.geometry.setFromPoints(stroke.points);
                    }
                    break;
                case 'end':
                    if (stroke) {
                        stroke.points = points;
                        stroke.line.geometry.setFromPoints(stroke.points);
                        delete remoteStrokes[userId];
                    }
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
