# Smooth Line Drawing Implementation

This document describes the implementation of the smooth line drawing algorithm from [Krzysztof Zabłocki's article](https://www.merowing.info/drawing-smooth-lines-with-cocos2d-ios-inspired-by-paper/) in our React-based collaborative whiteboard.

## Overview

The smooth line drawing algorithm has been fully integrated into the React whiteboard component (`src/components/Whiteboard.jsx`) and works seamlessly with the pub/sub collaboration system.

## Algorithm Features

The implementation includes all the key features from the original LineDrawing algorithm:

### 1. **Quadratic Bezier Smoothing**
- Uses quadratic Bezier curves with midpoints to smooth raw input points
- Formula: `B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2`
- Creates natural, flowing curves from discrete pointer input

### 2. **Speed-Based Width Variation**
- Line width dynamically adjusts based on drawing velocity
- Faster drawing = thinner lines (more precise)
- Slower drawing = thicker lines (more deliberate)
- Uses easing function for smooth transitions

### 3. **Anti-Aliasing with Overdraw**
- Main stroke is rendered as triangulated quads
- Extra "overdraw" pixels with fading alpha on edges
- Provides smooth, professional-looking edges without browser anti-aliasing limitations

### 4. **Circular End Caps**
- Smooth rounded ends on all strokes
- Prevents sharp or jagged stroke endings

## Code Structure

### `SmoothLineDrawer` Class

Located in `src/components/Whiteboard.jsx`, this class implements the algorithm:

```javascript
class SmoothLineDrawer {
  constructor() {
    this.overdraw = 3.0;  // Anti-aliasing pixels
    this.minSegmentDistance = 2;
    this.maxSegments = 128;
    this.minSegments = 32;
  }

  // Key methods:
  pointsToSmoothedLine(points, baseWidth, speedSensitivity)
  quadraticBezier(p0, p1, p2, t)
  calculateSpeedBasedWidth(baseWidth, speed, speedSensitivity)
  drawSmoothedStroke(ctx, smoothedPoints, color, opacity)
}
```

### Integration Points

1. **Drawing**: When user draws, raw points are collected
2. **Smoothing**: Points are processed through the algorithm during render
3. **Rendering**: Smoothed points are drawn using triangulated geometry
4. **Collaboration**: Complete strokes with all points are synced via pub/sub

## Collaboration Integration

The smooth line drawing works with the pub/sub server:

### Local Drawing
1. User starts drawing → `stroke-start` event with initial point
2. User moves → `stroke-append` events with new points
3. User finishes → `stroke-end` event with complete point array
4. Each event is sent to collaboration bridge

### Remote Drawing
1. Remote `stroke-end` events arrive via WebPubSub
2. Complete stroke data (including all points) is extracted
3. Stroke is added to local scene
4. Same smooth rendering algorithm applies to remote strokes

### Event Format
```javascript
{
  type: 'stroke-end',
  stroke: {
    id: 's-1234567890-abc123',
    tool: 'pencil',
    color: '#000000',
    opacity: 1,
    width: 4,
    points: [{x: 10, y: 20}, {x: 15, y: 25}, ...],
    timestamp: 1234567890
  },
  action: 'end',
  points: [...] // redundant but kept for compatibility
}
```

## Performance Considerations

- **Segment Count**: Adaptive based on distance (32-128 segments)
- **Velocity Smoothing**: 3-point moving average
- **Deduplication**: Stroke IDs prevent duplicate rendering
- **Canvas Optimization**: Direct 2D canvas API for performance

## Testing

To test the smooth line drawing:

1. Start the dev server: `npm run dev`
2. Create a room
3. Draw with varying speeds:
   - Fast strokes should be smooth and slightly thinner
   - Slow strokes should be smooth and slightly thicker
   - All strokes should have smooth curves and rounded ends
4. Open the room in another browser/tab to test collaboration
5. Verify remote strokes render identically using the same algorithm

## Comparison to Original

| Feature | Original (iOS/Cocos2D) | Our Implementation (Canvas) |
|---------|------------------------|----------------------------|
| Smoothing | Quadratic Bezier | ✅ Quadratic Bezier |
| Speed-based width | ✅ Yes | ✅ Yes |
| Anti-aliasing | OpenGL overdraw | ✅ Canvas gradients |
| End caps | Circle geometry | ✅ Arc drawing |
| Triangulation | OpenGL triangles | ✅ Canvas quads |

## Future Enhancements

Possible improvements:
- [ ] Configurable smoothing sensitivity per user
- [ ] Pressure sensitivity for devices that support it
- [ ] Custom brush textures
- [ ] Stroke simplification for bandwidth optimization
- [ ] WebGL renderer for even better performance

## References

- Original article: https://www.merowing.info/drawing-smooth-lines-with-cocos2d-ios-inspired-by-paper/
- Original iOS code: https://github.com/krzysztofzablocki/LineDrawing
