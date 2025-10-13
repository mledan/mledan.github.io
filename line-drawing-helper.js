// LineDrawing Helper - Implements smooth line drawing algorithm from Krzysztof Zabłocki's LineDrawing
// Adapted for Three.js/WebGL from the original iOS/Cocos2D/OpenGL implementation
// https://github.com/krzysztofzablocki/LineDrawing
//
// This implementation follows the exact algorithm from the original:
// 1. Uses quadratic Bezier curves with midpoints for smoothing (not Catmull-Rom)
// 2. Speed-based width variation for natural drawing feel
// 3. Triangulated geometry with overdraw for anti-aliasing
// 4. Circular end caps for smooth line endings
//
// Algorithm overview:
// - Points are smoothed using quadratic Bezier interpolation between midpoints
// - Line width varies based on drawing velocity (faster = thinner)
// - Each line segment is rendered as a quad (2 triangles) with perpendicular offset
// - Anti-aliasing is achieved through overdraw with fading alpha
// - End caps are rendered as triangle fans forming circles

import * as THREE from 'three';

export class LineDrawingHelper {
    constructor() {
        this.overdraw = 3.0; // Extra pixels for anti-aliasing
        this.minSegmentDistance = 2;
        this.maxSegments = 128;
        this.minSegments = 32;
        
        // Default stroke options
        this.defaultOptions = {
            color: '#000000',
            width: 16,
            opacity: 1,
            smoothing: 0.5,
            thinning: 0.5,
            // Speed-based width variation
            speedSensitivity: 0.5,
            minSpeedWidth: 0.5, // Minimum width multiplier at high speed
            maxSpeedWidth: 1.5, // Maximum width multiplier at low speed
        };
    }

    // Calculate speed-based width for a point
    calculateSpeedBasedWidth(baseWidth, speed, options) {
        const { speedSensitivity, minSpeedWidth, maxSpeedWidth } = options;
        
        // Normalize speed (0 = slow, 1 = fast)
        const maxSpeed = 100; // pixels per frame
        const normalizedSpeed = Math.min(speed / maxSpeed, 1);
        
        // Apply easing to speed
        const easedSpeed = this.easeInOutQuad(normalizedSpeed);
        
        // Calculate width multiplier (inverse relationship with speed)
        const widthMultiplier = minSpeedWidth + (maxSpeedWidth - minSpeedWidth) * (1 - easedSpeed * speedSensitivity);
        
        return baseWidth * widthMultiplier;
    }

    // Easing function for smooth transitions
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    // Convert input points to smoothed line points with width
    // Using the quadratic Bezier approach from the original LineDrawing algorithm
    pointsToSmoothedLine(points, options = {}) {
        if (points.length < 2) return [];
        
        const opts = { ...this.defaultOptions, ...options };
        const smoothedPoints = [];
        
        // Calculate velocities for speed-based width
        const velocities = this.calculateVelocities(points);
        
        if (points.length === 2) {
            // Simple case: just two points
            smoothedPoints.push({
                pos: points[0],
                width: this.calculateSpeedBasedWidth(opts.width, velocities[0], opts)
            });
            smoothedPoints.push({
                pos: points[1],
                width: this.calculateSpeedBasedWidth(opts.width, velocities[1], opts)
            });
        } else if (points.length > 2) {
            // Use quadratic Bezier with midpoints like the original LineDrawing
            // This follows the exact algorithm from Krzysztof Zabłocki's implementation
            for (let i = 2; i < points.length; i++) {
                const prev2 = points[i - 2];
                const prev1 = points[i - 1];
                const cur = points[i];
                
                // Calculate midpoints
                const midPoint1 = {
                    x: (prev1.x + prev2.x) * 0.5,
                    y: (prev1.y + prev2.y) * 0.5,
                    z: ((prev1.z || 0) + (prev2.z || 0)) * 0.5
                };
                
                const midPoint2 = {
                    x: (cur.x + prev1.x) * 0.5,
                    y: (cur.y + prev1.y) * 0.5,
                    z: ((cur.z || 0) + (prev1.z || 0)) * 0.5
                };
                
                // Calculate distance and number of segments
                const distance = this.distance(midPoint1, midPoint2);
                const segments = Math.max(
                    this.minSegments,
                    Math.min(this.maxSegments, Math.floor(distance / this.minSegmentDistance))
                );
                
                // Interpolate along the quadratic Bezier curve
                let t = 0.0;
                const step = 1.0 / segments;
                
                for (let j = 0; j < segments; j++) {
                    // Quadratic Bezier interpolation: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
                    const oneMinusT = 1 - t;
                    const point = {
                        x: oneMinusT * oneMinusT * midPoint1.x + 2.0 * oneMinusT * t * prev1.x + t * t * midPoint2.x,
                        y: oneMinusT * oneMinusT * midPoint1.y + 2.0 * oneMinusT * t * prev1.y + t * t * midPoint2.y,
                        z: oneMinusT * oneMinusT * midPoint1.z + 2.0 * oneMinusT * t * (prev1.z || 0) + t * t * midPoint2.z
                    };
                    
                    // Calculate width with quadratic interpolation for smooth thickness transition
                    const width1 = (prev1.width || opts.width) + (prev2.width || opts.width);
                    const width2 = (cur.width || opts.width) + (prev1.width || opts.width);
                    const avgWidth1 = this.calculateSpeedBasedWidth(width1 * 0.5, velocities[i - 2], opts);
                    const avgWidth2 = this.calculateSpeedBasedWidth(width2 * 0.5, velocities[i - 1], opts);
                    
                    const width = oneMinusT * oneMinusT * avgWidth1 + 
                                 2.0 * oneMinusT * t * this.calculateSpeedBasedWidth(prev1.width || opts.width, velocities[i - 1], opts) + 
                                 t * t * avgWidth2;
                    
                    smoothedPoints.push({ pos: point, width });
                    t += step;
                }
                
                // Add final point for this segment
                const finalWidth = this.calculateSpeedBasedWidth((cur.width || opts.width + prev1.width || opts.width) * 0.5, velocities[i], opts);
                smoothedPoints.push({
                    pos: midPoint2,
                    width: finalWidth
                });
            }
        }
        
        return smoothedPoints;
    }

    // Calculate velocities between points
    calculateVelocities(points) {
        const velocities = [];
        
        for (let i = 0; i < points.length; i++) {
            if (i === 0) {
                velocities.push(0);
            } else {
                const dist = this.distance(points[i - 1], points[i]);
                velocities.push(dist);
            }
        }
        
        // Smooth velocities
        const smoothedVelocities = [];
        for (let i = 0; i < velocities.length; i++) {
            const prev = velocities[Math.max(0, i - 1)];
            const curr = velocities[i];
            const next = velocities[Math.min(velocities.length - 1, i + 1)];
            smoothedVelocities.push((prev + curr + next) / 3);
        }
        
        return smoothedVelocities;
    }

    // Quadratic Bezier interpolation
    // B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
    // This is the interpolation method used in the original LineDrawing algorithm
    quadraticBezierInterpolate(p0, p1, p2, t) {
        const oneMinusT = 1 - t;
        const x = oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x;
        const y = oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y;
        const z = oneMinusT * oneMinusT * (p0.z || 0) + 2 * oneMinusT * t * (p1.z || 0) + t * t * (p2.z || 0);
        
        return { x, y, z };
    }

    // Calculate distance between two points
    distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = (p2.z || 0) - (p1.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // Create geometry for a smoothed line
    createLineGeometry(smoothedPoints, options = {}) {
        if (smoothedPoints.length < 2) return null;
        
        const vertices = [];
        const indices = [];
        const colors = [];
        const uvs = [];
        
        const color = new THREE.Color(options.color || '#000000');
        const opacity = options.opacity || 1;
        
        // Generate triangulated mesh for the line
        for (let i = 0; i < smoothedPoints.length - 1; i++) {
            const curr = smoothedPoints[i];
            const next = smoothedPoints[i + 1];
            
            // Calculate perpendicular direction
            const dir = {
                x: next.pos.x - curr.pos.x,
                y: next.pos.y - curr.pos.y,
                z: (next.pos.z || 0) - (curr.pos.z || 0)
            };
            
            const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
            if (len < 0.0001) continue; // Skip duplicate points
            
            // Normalize and get perpendicular
            dir.x /= len;
            dir.y /= len;
            
            const perp = { x: -dir.y, y: dir.x, z: 0 };
            
            // Create vertices for this segment
            const baseIndex = vertices.length / 3;
            
            // Main line vertices
            this.addVertex(vertices, curr.pos, perp, curr.width / 2);
            this.addVertex(vertices, curr.pos, perp, -curr.width / 2);
            this.addVertex(vertices, next.pos, perp, next.width / 2);
            this.addVertex(vertices, next.pos, perp, -next.width / 2);
            
            // Overdraw vertices for anti-aliasing
            this.addVertex(vertices, curr.pos, perp, curr.width / 2 + this.overdraw);
            this.addVertex(vertices, curr.pos, perp, -curr.width / 2 - this.overdraw);
            this.addVertex(vertices, next.pos, perp, next.width / 2 + this.overdraw);
            this.addVertex(vertices, next.pos, perp, -next.width / 2 - this.overdraw);
            
            // Add colors
            for (let j = 0; j < 4; j++) {
                colors.push(color.r, color.g, color.b, opacity);
            }
            // Fade out colors for overdraw
            for (let j = 0; j < 4; j++) {
                colors.push(color.r, color.g, color.b, 0);
            }
            
            // Add UVs
            uvs.push(0, 0, 0, 1, 1, 0, 1, 1);
            uvs.push(0, 0, 0, 1, 1, 0, 1, 1);
            
            // Main line triangles
            indices.push(
                baseIndex, baseIndex + 1, baseIndex + 2,
                baseIndex + 1, baseIndex + 3, baseIndex + 2
            );
            
            // Overdraw triangles
            indices.push(
                baseIndex + 4, baseIndex, baseIndex + 6,
                baseIndex, baseIndex + 2, baseIndex + 6,
                baseIndex + 1, baseIndex + 5, baseIndex + 3,
                baseIndex + 5, baseIndex + 7, baseIndex + 3
            );
        }
        
        // Create geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        
        return geometry;
    }

    // Helper to add a vertex
    addVertex(vertices, pos, perp, offset) {
        vertices.push(
            pos.x + perp.x * offset,
            pos.y + perp.y * offset,
            pos.z || 0
        );
    }

    // Create a mesh from points
    createStrokeMesh(points, color, options = {}) {
        if (!points || points.length < 2) return null;
        
        const opts = { ...options, color };
        const smoothedPoints = this.pointsToSmoothedLine(points, opts);
        const geometry = this.createLineGeometry(smoothedPoints, opts);
        
        if (!geometry) return null;
        
        const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Add end caps
        if (smoothedPoints.length >= 2) {
            const startCap = this.createEndCap(smoothedPoints[0], smoothedPoints[1], opts);
            const endCap = this.createEndCap(
                smoothedPoints[smoothedPoints.length - 1],
                smoothedPoints[smoothedPoints.length - 2],
                opts
            );
            
            if (startCap) mesh.add(startCap);
            if (endCap) mesh.add(endCap);
        }
        
        return mesh;
    }

    // Create circular end cap
    createEndCap(point, prevPoint, options) {
        const segments = 32;
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const colors = [];
        
        const color = new THREE.Color(options.color || '#000000');
        const opacity = options.opacity || 1;
        const radius = point.width / 2;
        
        // Center vertex
        vertices.push(point.pos.x, point.pos.y, point.pos.z || 0);
        colors.push(color.r, color.g, color.b, opacity);
        
        // Circle vertices
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = point.pos.x + Math.cos(angle) * radius;
            const y = point.pos.y + Math.sin(angle) * radius;
            vertices.push(x, y, point.pos.z || 0);
            colors.push(color.r, color.g, color.b, opacity);
            
            if (i > 0) {
                indices.push(0, i, i + 1);
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
        geometry.setIndex(indices);
        
        const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false
        });
        
        return new THREE.Mesh(geometry, material);
    }

    // Update existing mesh with new points
    updateStrokeMesh(mesh, points, options = {}) {
        if (!mesh || !points || points.length < 2) return;
        
        const opts = { ...options, color: mesh.material.color };
        const smoothedPoints = this.pointsToSmoothedLine(points, opts);
        const geometry = this.createLineGeometry(smoothedPoints, opts);
        
        if (!geometry) return;
        
        // Dispose old geometry
        mesh.geometry.dispose();
        mesh.geometry = geometry;
        
        // Update end caps
        mesh.children.forEach(child => {
            child.geometry.dispose();
            child.material.dispose();
        });
        mesh.children = [];
        
        if (smoothedPoints.length >= 2) {
            const startCap = this.createEndCap(smoothedPoints[0], smoothedPoints[1], opts);
            const endCap = this.createEndCap(
                smoothedPoints[smoothedPoints.length - 1],
                smoothedPoints[smoothedPoints.length - 2],
                opts
            );
            
            if (startCap) mesh.add(startCap);
            if (endCap) mesh.add(endCap);
        }
    }

    // Get options from brush properties
    getOptionsFromBrush(brushProperties) {
        const options = { ...this.defaultOptions };
        
        // Map brush properties
        if (brushProperties.width !== undefined) {
            options.width = brushProperties.width;
        }
        
        if (brushProperties.opacity !== undefined) {
            options.opacity = brushProperties.opacity;
        }
        
        if (brushProperties.color !== undefined) {
            options.color = brushProperties.color;
        }
        
        // Adjust smoothing based on brush type
        if (brushProperties.brush === 'pencil') {
            options.smoothing = 0.3;
            options.thinning = 0.6;
            options.speedSensitivity = 0.7;
        } else if (brushProperties.brush === 'marker') {
            options.smoothing = 0.5;
            options.thinning = 0.3;
            options.speedSensitivity = 0.3;
        } else if (brushProperties.brush === 'airbrush') {
            options.smoothing = 0.8;
            options.thinning = 0.1;
            options.speedSensitivity = 0.1;
        }
        
        return options;
    }
}

export default LineDrawingHelper;