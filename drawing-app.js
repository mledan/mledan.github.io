import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineDrawingHelper } from './line-drawing-helper.js';
import { StrokePropertiesFactory } from './stroke-properties-factory.js';
import { Quadtree } from './quadtree.js';

// Douglas-Peucker line simplification algorithm
function simplifyDouglasPeucker(points, tolerance) {
    if (points.length <= 2) return points;
    
    // Find the point with the maximum distance from the line between start and end
    let maxDistance = 0;
    let maxIndex = 0;
    const start = points[0];
    const end = points[points.length - 1];
    
    for (let i = 1; i < points.length - 1; i++) {
        const distance = perpendicularDistance(points[i], start, end);
        if (distance > maxDistance) {
            maxDistance = distance;
            maxIndex = i;
        }
    }
    
    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
        const left = simplifyDouglasPeucker(points.slice(0, maxIndex + 1), tolerance);
        const right = simplifyDouglasPeucker(points.slice(maxIndex), tolerance);
        return left.slice(0, -1).concat(right);
    } else {
        return [start, end];
    }
}

function perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const dz = (lineEnd.z || 0) - (lineStart.z || 0);
    
    if (dx === 0 && dy === 0 && dz === 0) {
        // Line start and end are the same
        const pdx = point.x - lineStart.x;
        const pdy = point.y - lineStart.y;
        const pdz = (point.z || 0) - (lineStart.z || 0);
        return Math.sqrt(pdx * pdx + pdy * pdy + pdz * pdz);
    }
    
    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy + ((point.z || 0) - (lineStart.z || 0)) * dz) / (dx * dx + dy * dy + dz * dz);
    const t_clamped = Math.max(0, Math.min(1, t));
    
    const nearestX = lineStart.x + t_clamped * dx;
    const nearestY = lineStart.y + t_clamped * dy;
    const nearestZ = (lineStart.z || 0) + t_clamped * dz;
    
    const distX = point.x - nearestX;
    const distY = point.y - nearestY;
    const distZ = (point.z || 0) - nearestZ;
    
    return Math.sqrt(distX * distX + distY * distY + distZ * distZ);
}

window.addEventListener('DOMContentLoaded', () => {
    // Initialize Line Drawing helper
    const lineDrawingHelper = new LineDrawingHelper();
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
        
        // Glow effect - create a larger, semi-transparent copy behind the stroke
        if (effects.includes('glow') && stroke.points.length > 1) {
            const glowOptions = lineDrawingHelper.getOptionsFromBrush({
                width: stroke.properties.width * 2.5, // Larger for glow
                opacity: 0.3,
                brush: 'glow'
            });
            
            const glowMesh = lineDrawingHelper.createStrokeMesh(
                stroke.points,
                stroke.properties.color,
                glowOptions
            );
            
            if (glowMesh) {
                glowMesh.position.z = -0.01; // Slightly behind main stroke
                scene.add(glowMesh);
                stroke.glowMesh = glowMesh;
            }
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
                if (effect.stroke.line && effect.stroke.line.material) {
                    effect.stroke.line.material.color.setHSL(hue / 360, 1.0, 0.5);
                }
                if (effect.stroke.glowMesh && effect.stroke.glowMesh.material) {
                    effect.stroke.glowMesh.material.color.setHSL(hue / 360, 1.0, 0.5);
                }
            } else if (effect.type === 'pulse') {
                effect.phase += 0.05;
                const scale = 1 + Math.sin(effect.phase) * 0.3;
                if (effect.stroke.line) {
                    effect.stroke.line.scale.set(scale, scale, 1);
                }
                if (effect.stroke.glowMesh) {
                    effect.stroke.glowMesh.scale.set(scale, scale, 1);
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

        // Create initial mesh using line drawing algorithm (will be updated as we draw)
        const freehandOptions = lineDrawingHelper.getOptionsFromBrush({
            width: currentStroke.properties.width,
            opacity: currentStroke.properties.opacity,
            brush: brushProps ? brushProps.brush : 'pencil'
        });
        
        // Start with a simple point - will be updated on move
        const mesh = lineDrawingHelper.createStrokeMesh(
            currentStroke.points,
            currentStroke.properties.color,
            freehandOptions
        );
        
        if (mesh) {
            scene.add(mesh);
            currentStroke.line = mesh; // Keep same property name for compatibility
        }
        
        // Apply special effects
        if (currentStroke.properties.effects && currentStroke.properties.effects.length > 0) {
            applyEffectsToStroke(currentStroke, scene);
        }

        // Create simplified version for LOD (Level of Detail) at distance
        const simplifiedPoints = simplifyDouglasPeucker(currentStroke.points, 5);
        currentStroke.simplifiedPoints = simplifiedPoints;
        
        // We'll create the simplified mesh later when we have more points
        currentStroke.simplifiedLine = null;

        if (currentStroke.line) {
            const boundingBox = new THREE.Box3().setFromObject(currentStroke.line);
            quadtree.insert({
                x: boundingBox.min.x,
                y: boundingBox.min.y,
                width: boundingBox.max.x - boundingBox.min.x,
                height: boundingBox.max.y - boundingBox.min.y,
                stroke: currentStroke
            });
        }

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
        
        // Update the stroke mesh with line drawing algorithm
        if (currentStroke.line && currentStroke.points.length > 1) {
            const brushProps = window.brushEngine ? window.brushEngine.getBrushProperties() : null;
            const freehandOptions = lineDrawingHelper.getOptionsFromBrush({
                width: currentStroke.properties.width,
                opacity: currentStroke.properties.opacity,
                brush: brushProps ? brushProps.brush : 'pencil'
            });
            
            lineDrawingHelper.updateStrokeMesh(currentStroke.line, currentStroke.points, freehandOptions);
        }

        if (window.collaborationBridge) {
            window.collaborationBridge.onDrawMove(intersection.x, intersection.y);
        }
    });

    renderer.domElement.addEventListener('pointerup', () => {
        if (currentStroke) {
            // Create simplified version for LOD
            const lastStroke = strokes[strokes.length - 1];
            if (lastStroke && lastStroke.points.length > 2) {
                const simplifiedPoints = simplifyDouglasPeucker(lastStroke.points, 1);
                lastStroke.simplifiedPoints = simplifiedPoints;
                
                // Create simplified mesh
                const brushProps = window.brushEngine ? window.brushEngine.getBrushProperties() : null;
                const freehandOptions = lineDrawingHelper.getOptionsFromBrush({
                    width: lastStroke.properties.width,
                    opacity: lastStroke.properties.opacity,
                    brush: brushProps ? brushProps.brush : 'pencil'
                });
                
                const simplifiedMesh = lineDrawingHelper.createStrokeMesh(
                    simplifiedPoints,
                    lastStroke.properties.color,
                    freehandOptions
                );
                
                if (simplifiedMesh) {
                    simplifiedMesh.visible = false; // Hidden by default, shown at distance
                    scene.add(simplifiedMesh);
                    lastStroke.simplifiedLine = simplifiedMesh;
                }
                
                if (window.collaborationBridge) {
                    window.collaborationBridge.onDrawEnd(simplifiedPoints);
                }
            }
        }
        
        isDrawing = false;
        currentStroke = null;
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

                    // Create initial mesh with line drawing algorithm
                    const freehandOptions = lineDrawingHelper.getOptionsFromBrush({
                        width: stroke.properties.width,
                        opacity: stroke.properties.opacity || 1,
                        brush: 'pencil'
                    });
                    
                    const mesh = lineDrawingHelper.createStrokeMesh(
                        stroke.points,
                        stroke.properties.color,
                        freehandOptions
                    );
                    
                    if (mesh) {
                        scene.add(mesh);
                        stroke.line = mesh;
                    }
                    break;
                case 'move':
                    if (stroke && stroke.line) {
                        stroke.points.push(new THREE.Vector3(x, y, 0));
                        
                        // Update mesh with line drawing algorithm
                        if (stroke.points.length > 1) {
                            const freehandOptions = lineDrawingHelper.getOptionsFromBrush({
                                width: stroke.properties.width,
                                opacity: stroke.properties.opacity || 1,
                                brush: 'pencil'
                            });
                            lineDrawingHelper.updateStrokeMesh(stroke.line, stroke.points, freehandOptions);
                        }
                    }
                    break;
                case 'end':
                    if (stroke && stroke.line) {
                        stroke.points = points.map(p => new THREE.Vector3(p.x, p.y, p.z || 0));
                        
                        // Final update with all points
                        const freehandOptions = lineDrawingHelper.getOptionsFromBrush({
                            width: stroke.properties.width,
                            opacity: stroke.properties.opacity || 1,
                            brush: 'pencil'
                        });
                        lineDrawingHelper.updateStrokeMesh(stroke.line, stroke.points, freehandOptions);
                        
                        // Move to permanent strokes
                        strokes.push(stroke);
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
