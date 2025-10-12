// LineDrawing Helper - Implements smooth line drawing algorithm inspired by Krzysztof Zabłocki's LineDrawing
// Adapted for Three.js from the original iOS/OpenGL implementation
// https://github.com/krzysztofzablocki/LineDrawing

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
        } else {
            // Use Catmull-Rom spline for smoothing
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[Math.max(0, i - 1)];
                const p1 = points[i];
                const p2 = points[i + 1];
                const p3 = points[Math.min(points.length - 1, i + 2)];
                
                // Calculate segment distance
                const distance = this.distance(p1, p2);
                const segments = Math.max(
                    this.minSegments,
                    Math.min(this.maxSegments, Math.floor(distance / this.minSegmentDistance))
                );
                
                // Interpolate along the curve
                for (let j = 0; j < segments; j++) {
                    const t = j / segments;
                    const point = this.catmullRomInterpolate(p0, p1, p2, p3, t);
                    
                    // Interpolate velocity and calculate width
                    const velocity = velocities[i] * (1 - t) + velocities[i + 1] * t;
                    const width = this.calculateSpeedBasedWidth(opts.width, velocity, opts);
                    
                    smoothedPoints.push({ pos: point, width });
                }
            }
            
            // Add the last point
            const lastVelocity = velocities[velocities.length - 1];
            smoothedPoints.push({
                pos: points[points.length - 1],
                width: this.calculateSpeedBasedWidth(opts.width, lastVelocity, opts)
            });
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

    // Catmull-Rom spline interpolation
    catmullRomInterpolate(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        
        const v0 = (p2.x - p0.x) * 0.5;
        const v1 = (p3.x - p1.x) * 0.5;
        const x = p1.x + v0 * t + (3 * (p2.x - p1.x) - 2 * v0 - v1) * t2 + (2 * (p1.x - p2.x) + v0 + v1) * t3;
        
        const v0y = (p2.y - p0.y) * 0.5;
        const v1y = (p3.y - p1.y) * 0.5;
        const y = p1.y + v0y * t + (3 * (p2.y - p1.y) - 2 * v0y - v1y) * t2 + (2 * (p1.y - p2.y) + v0y + v1y) * t3;
        
        const v0z = (p2.z - p0.z) * 0.5;
        const v1z = (p3.z - p1.z) * 0.5;
        const z = p1.z + v0z * t + (3 * (p2.z - p1.z) - 2 * v0z - v1z) * t2 + (2 * (p1.z - p2.z) + v0z + v1z) * t3;
        
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