# LineDrawing Algorithm Implementation

## Overview
This document describes how we've integrated Krzysztof Zabłocki's [LineDrawing algorithm](https://github.com/krzysztofzablocki/LineDrawing) into our Three.js-based drawing application.

## Original Project
The LineDrawing project by Krzysztof Zabłocki ([@merowing_](https://twitter.com/merowing_)) is an iOS/Cocos2D implementation that provides beautiful, smooth line drawing with anti-aliasing. It was created for the [Foldify](http://foldifyapp.com) app.

**Key Features:**
- Smooth line drawing using quadratic Bezier curves
- Speed-based width variation (faster = thinner, like a real pen)
- OpenGL-based anti-aliasing using overdraw technique
- Used in production apps with excellent results

## Our Implementation

### Adaptation to JavaScript/Three.js
We've adapted the original Objective-C/OpenGL implementation to JavaScript/WebGL/Three.js:

**File:** `line-drawing-helper.js`

```javascript
// Core algorithm components:

1. Quadratic Bezier Smoothing
   - Calculate midpoints between consecutive input points
   - Use quadratic Bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
   - P0 = midpoint1, P1 = control point, P2 = midpoint2

2. Speed-Based Width
   - Calculate velocity between points
   - Inverse relationship: faster drawing = thinner lines
   - Smooth width transitions using the same Bezier interpolation

3. Triangulated Geometry
   - Each segment becomes a quad (2 triangles)
   - Perpendicular offset creates line width
   - Overdraw quads for anti-aliasing

4. Anti-Aliasing
   - Main triangles: full opacity
   - Overdraw triangles: fade to transparent
   - Creates smooth edges without jaggies

5. End Caps
   - Circular caps using triangle fans
   - 32 segments for smooth circles
   - Matches line width at endpoints
```

## Key Differences from Original

| Aspect | Original (iOS) | Our Implementation (Web) |
|--------|---------------|--------------------------|
| Platform | iOS/Cocos2D | JavaScript/Three.js |
| Graphics API | OpenGL ES | WebGL |
| Language | Objective-C | JavaScript ES6 |
| Rendering | CCRenderTexture | Three.js BufferGeometry |
| Input | UITouch with force | PointerEvent |

## Algorithm Fidelity

We've maintained the core algorithm exactly as designed:

✅ **Quadratic Bezier interpolation with midpoints** - Same as original
✅ **Speed-based width variation** - Same formula
✅ **Overdraw anti-aliasing** - Same technique with 3px overdraw
✅ **Circular end caps** - Same 32-segment fans
✅ **Triangulated geometry** - Same approach

## Integration Points

### 1. Drawing App (`drawing-app.js`)
```javascript
import { LineDrawingHelper } from './line-drawing-helper.js';

const lineDrawingHelper = new LineDrawingHelper();

// On draw start
const mesh = lineDrawingHelper.createStrokeMesh(points, color, options);
scene.add(mesh);

// On draw move
lineDrawingHelper.updateStrokeMesh(mesh, points, options);
```

### 2. Pub/Sub System (`pubsub.js`)
The drawing system integrates seamlessly with the existing pub/sub collaboration system:
- Draw events are broadcasted to all users
- Remote strokes are rendered using the same algorithm
- Maintains consistency across all clients

### 3. Effects System (`drawing-app.js`)
The LineDrawing algorithm works with additional effects:
- Glow effects
- Sparkle effects
- Rainbow color cycling
- Pulse animations

## Testing

Build and run:
```bash
npm run build
npm run preview
```

Test files:
- `test-line-drawing.html` - Interactive test page
- `test-line-drawing-unit.js` - Unit tests

## Performance

The implementation includes several optimizations:
- **Quadtree spatial indexing** for efficient culling
- **LOD system** with Douglas-Peucker simplification
- **Geometry caching** and reuse
- **Batch updates** for collaboration

## Credits

- Original algorithm: [Krzysztof Zabłocki](https://twitter.com/merowing_)
- Blog post: http://www.merowing.info/2012/04/drawing-smooth-lines-with-cocos2d-ios-inspired-by-paper/
- GitHub: https://github.com/krzysztofzablocki/LineDrawing
- Inspired by: [Paper by FiftyThree](https://www.fiftythree.com/paper)

## License

The original LineDrawing project is licensed under MIT. Our implementation maintains attribution and follows the same license terms.
