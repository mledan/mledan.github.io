// Unit test for LineDrawingHelper
import { LineDrawingHelper } from './line-drawing-helper.js';

console.log('Testing LineDrawingHelper...');

const helper = new LineDrawingHelper();

// Test 1: Basic point smoothing
console.log('\nTest 1: Basic point smoothing');
const testPoints = [
    { x: 0, y: 0, z: 0 },
    { x: 10, y: 10, z: 0 },
    { x: 20, y: 5, z: 0 },
    { x: 30, y: 15, z: 0 }
];

const smoothedPoints = helper.pointsToSmoothedLine(testPoints);
console.log(`Input points: ${testPoints.length}`);
console.log(`Smoothed points: ${smoothedPoints.length}`);
console.log('First smoothed point:', smoothedPoints[0]);
console.log('Last smoothed point:', smoothedPoints[smoothedPoints.length - 1]);

// Test 2: Speed-based width calculation
console.log('\nTest 2: Speed-based width calculation');
const baseWidth = 10;
const speeds = [0, 25, 50, 75, 100];
speeds.forEach(speed => {
    const width = helper.calculateSpeedBasedWidth(baseWidth, speed, helper.defaultOptions);
    console.log(`Speed: ${speed}, Width: ${width.toFixed(2)}`);
});

// Test 3: Mesh creation
console.log('\nTest 3: Mesh creation');
try {
    const mesh = helper.createStrokeMesh(testPoints, '#ff0000', { width: 5, opacity: 0.8 });
    if (mesh) {
        console.log('✓ Mesh created successfully');
        console.log(`  Vertices: ${mesh.geometry.attributes.position.count}`);
        console.log(`  Has material: ${!!mesh.material}`);
        console.log(`  End caps: ${mesh.children.length}`);
    } else {
        console.log('✗ Failed to create mesh');
    }
} catch (error) {
    console.error('✗ Error creating mesh:', error.message);
}

// Test 4: Different brush types
console.log('\nTest 4: Different brush types');
const brushTypes = ['pencil', 'marker', 'airbrush'];
brushTypes.forEach(brush => {
    const options = helper.getOptionsFromBrush({ brush, width: 10 });
    console.log(`${brush}: smoothing=${options.smoothing}, thinning=${options.thinning}, speedSensitivity=${options.speedSensitivity}`);
});

console.log('\n✓ All tests completed!');