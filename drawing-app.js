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
    controls.enabled = false;  // Disable orbit controls - keep scene static
    // controls.enableDamping = true;
    // controls.dampingFactor = 0.05;
    // controls.screenSpacePanning = true;

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
    
    // Effects system
    const effectsObjects = [];
    let rainbowPhase = 0;
    
    function applyEffectsToStroke(stroke, scene) {
        const effects = stroke.properties.effects;
        
        // Glow effect
        if (effects.includes('glow')) {
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: stroke.properties.color,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            
            // Create a tube geometry for glow
            const curve = new THREE.CatmullRomCurve3(
                stroke.points.map(p => new THREE.Vector3(p.x, p.y, p.z))
            );
            const tubeGeometry = new THREE.TubeGeometry(
                curve,
                stroke.points.length * 2,
                stroke.properties.width * 3,
                8,
                false
            );
            const glowMesh = new THREE.Mesh(tubeGeometry, glowMaterial);
            scene.add(glowMesh);
            stroke.glowMesh = glowMesh;
        }
        
        // Sparkle effect
        if (effects.includes('sparkle')) {
            stroke.sparkles = [];
            const sparkleGeometry = new THREE.BufferGeometry();
            const sparkleCount = 20;
            const positions = [];
            const sizes = [];
            
            for (let i = 0; i < sparkleCount; i++) {
                const t = i / sparkleCount;
                const index = Math.floor(t * (stroke.points.length - 1));
                const point = stroke.points[index];
                if (point) {
                    positions.push(
                        point.x + (Math.random() - 0.5) * stroke.properties.width * 2,
                        point.y + (Math.random() - 0.5) * stroke.properties.width * 2,
                        point.z
                    );
                    sizes.push(Math.random() * 3 + 1);
                }
            }
            
            sparkleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            sparkleGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
            
            const sparkleMaterial = new THREE.PointsMaterial({
                size: 2,
                color: 0xffffff,
                transparent: true,
                opacity: 0.8,
                sizeAttenuation: true,
                vertexColors: false,
                blending: THREE.AdditiveBlending
            });
            
            const sparkleSystem = new THREE.Points(sparkleGeometry, sparkleMaterial);
            scene.add(sparkleSystem);
            stroke.sparkleSystem = sparkleSystem;
            
            // Animate sparkles
            effectsObjects.push({
                type: 'sparkle',
                object: sparkleSystem,
                phase: 0
            });
        }
        
        // Rainbow effect
        if (effects.includes('rainbow')) {
            stroke.rainbowEnabled = true;
            stroke.rainbowPhase = 0;
            effectsObjects.push({
                type: 'rainbow',
                stroke: stroke,
                phase: 0
            });
        }
        
        // Pulse effect  
        if (effects.includes('pulse')) {
            stroke.pulseEnabled = true;
            stroke.pulsePhase = 0;
            stroke.originalWidth = stroke.properties.width;
            effectsObjects.push({
                type: 'pulse',
                stroke: stroke,
                phase: 0
            });
        }
    }
    
    function updateEffects() {
        effectsObjects.forEach(effect => {
            if (effect.type === 'sparkle') {
                effect.phase += 0.05;
                effect.object.material.opacity = 0.4 + Math.sin(effect.phase) * 0.4;
                effect.object.rotation.z += 0.01;
            } else if (effect.type === 'rainbow') {
                effect.phase += 0.02;
                const hue = (effect.phase * 360) % 360;
                if (effect.stroke.line) {
                    effect.stroke.line.material.color.setHSL(hue / 360, 1.0, 0.5);
                }
                if (effect.stroke.glowMesh) {
                    effect.stroke.glowMesh.material.color.setHSL(hue / 360, 1.0, 0.5);
                }
            } else if (effect.type === 'pulse') {
                effect.phase += 0.05;
                const scale = 1 + Math.sin(effect.phase) * 0.3;
                if (effect.stroke.line) {
                    effect.stroke.line.scale.set(scale, scale, 1);
                }
                if (effect.stroke.glowMesh) {
                    effect.stroke.glowMesh.scale.set(scale, scale, scale);
                }
            }
        });
    }

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
        scene.add(line);
        currentStroke.line = line;
        
        // Apply special effects
        if (currentStroke.properties.effects && currentStroke.properties.effects.length > 0) {
            applyEffectsToStroke(currentStroke, scene);
        }

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
        // controls.update();  // Disabled - keeping scene static
        
        // Update effects animations
        updateEffects();

        const viewBounds = {
            x: camera.position.x - (window.innerWidth / 2 / camera.zoom),
            y: camera.position.y - (window.innerHeight / 2 / camera.zoom),
            width: window.innerWidth / camera.zoom,
            height: window.innerHeight / camera.zoom
        };

        strokes.forEach(stroke => {
            if (stroke.line) stroke.line.visible = false;
            if (stroke.simplifiedLine) stroke.simplifiedLine.visible = false;
        });

        const visibleStrokes = quadtree.retrieve(viewBounds);
        visibleStrokes.forEach(item => {
            if (!item.stroke.line) return;
            const distance = camera.position.distanceTo(item.stroke.line.position);
            if (distance > 500 && item.stroke.simplifiedLine) {
                item.stroke.line.visible = false;
                item.stroke.simplifiedLine.visible = true;
            } else {
                item.stroke.line.visible = true;
                if (item.stroke.simplifiedLine) {
                    item.stroke.simplifiedLine.visible = false;
                }
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
            // Remove all strokes and effects from the scene
            strokes.forEach(stroke => {
                if (stroke.line) scene.remove(stroke.line);
                if (stroke.simplifiedLine) scene.remove(stroke.simplifiedLine);
                if (stroke.glowMesh) scene.remove(stroke.glowMesh);
                if (stroke.sparkleSystem) scene.remove(stroke.sparkleSystem);
            });
            strokes.length = 0;
            strokeHistory.length = 0;
            redoHistory.length = 0;
            effectsObjects.length = 0;
            quadtree.clear();
        },
        
        undo: () => {
            if (strokes.length > 0) {
                const lastStroke = strokes.pop();
                if (lastStroke.line) scene.remove(lastStroke.line);
                if (lastStroke.simplifiedLine) scene.remove(lastStroke.simplifiedLine);
                if (lastStroke.glowMesh) scene.remove(lastStroke.glowMesh);
                if (lastStroke.sparkleSystem) scene.remove(lastStroke.sparkleSystem);
                
                // Remove from effects objects
                effectsObjects.forEach((effect, index) => {
                    if (effect.stroke === lastStroke || effect.object === lastStroke.sparkleSystem) {
                        effectsObjects.splice(index, 1);
                    }
                });
                
                redoHistory.push(lastStroke);
            }
        },
        
        redo: () => {
            if (redoHistory.length > 0) {
                const stroke = redoHistory.pop();
                if (stroke.line) scene.add(stroke.line);
                if (stroke.simplifiedLine) scene.add(stroke.simplifiedLine);
                if (stroke.glowMesh) scene.add(stroke.glowMesh);
                if (stroke.sparkleSystem) scene.add(stroke.sparkleSystem);
                
                // Re-add to effects if needed
                if (stroke.properties.effects && stroke.properties.effects.length > 0) {
                    applyEffectsToStroke(stroke, scene);
                }
                
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
