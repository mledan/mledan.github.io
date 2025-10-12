// Perfect Freehand Helper - Converts perfect-freehand strokes to Three.js geometry
import getStroke from 'https://unpkg.com/perfect-freehand@1.2.2/dist/esm/index.mjs';
import * as THREE from 'three';

export class PerfectFreehandHelper {
    constructor() {
        this.defaultOptions = {
            size: 16,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
            easing: (t) => t,
            start: {
                taper: 0,
                easing: (t) => t,
                cap: true
            },
            end: {
                taper: 100,
                easing: (t) => t,
                cap: true
            },
            simulatePressure: true,
        };
    }

    // Convert input points to perfect-freehand format
    pointsToStroke(points, options = {}) {
        const freehandPoints = points.map(p => [p.x, p.y, p.pressure || 0.5]);
        const strokeOptions = { ...this.defaultOptions, ...options };
        return getStroke(freehandPoints, strokeOptions);
    }

    // Convert perfect-freehand stroke to Three.js shape
    strokeToShape(stroke) {
        if (stroke.length === 0) return null;

        const shape = new THREE.Shape();
        
        // Start the shape at the first point
        const [x0, y0] = stroke[0];
        shape.moveTo(x0, y0);

        // Draw the outline of the stroke
        for (let i = 1; i < stroke.length; i++) {
            const [x, y] = stroke[i];
            shape.lineTo(x, y);
        }

        shape.closePath();
        return shape;
    }

    // Create a Three.js mesh from perfect-freehand stroke
    createStrokeMesh(points, color, options = {}) {
        const stroke = this.pointsToStroke(points, options);
        if (stroke.length === 0) return null;

        const shape = this.strokeToShape(stroke);
        if (!shape) return null;

        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: options.opacity < 1,
            opacity: options.opacity || 1
        });

        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
    }

    // Create an extruded (3D) stroke
    createExtrudedStroke(points, color, options = {}) {
        const stroke = this.pointsToStroke(points, options);
        if (stroke.length === 0) return null;

        const shape = this.strokeToShape(stroke);
        if (!shape) return null;

        const extrudeSettings = {
            depth: options.depth || 0.1,
            bevelEnabled: false
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: options.opacity < 1,
            opacity: options.opacity || 1
        });

        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
    }

    // Update existing mesh with new points
    updateStrokeMesh(mesh, points, options = {}) {
        const stroke = this.pointsToStroke(points, options);
        if (stroke.length === 0) return;

        const shape = this.strokeToShape(stroke);
        if (!shape) return;

        // Dispose old geometry
        mesh.geometry.dispose();
        
        // Create new geometry
        const geometry = new THREE.ShapeGeometry(shape);
        mesh.geometry = geometry;
    }

    // Get stroke options from brush properties
    getOptionsFromBrush(brushProperties) {
        const options = { ...this.defaultOptions };

        // Map brush size to perfect-freehand size
        options.size = brushProperties.width || 16;
        
        // Map brush opacity
        options.opacity = brushProperties.opacity || 1;

        // Adjust based on brush type
        if (brushProperties.brush === 'pencil') {
            options.thinning = 0.6;
            options.smoothing = 0.3;
            options.streamline = 0.3;
        } else if (brushProperties.brush === 'marker') {
            options.thinning = 0.3;
            options.smoothing = 0.5;
            options.streamline = 0.5;
        } else if (brushProperties.brush === 'airbrush') {
            options.thinning = 0.1;
            options.smoothing = 0.8;
            options.streamline = 0.7;
        } else if (brushProperties.brush === 'glow') {
            options.thinning = 0.4;
            options.smoothing = 0.7;
            options.streamline = 0.6;
        }

        // Adjust smoothing based on brush properties
        if (brushProperties.smoothing !== undefined) {
            options.smoothing = brushProperties.smoothing;
        }

        return options;
    }
}

export default PerfectFreehandHelper;
