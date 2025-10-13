import React, { useEffect, useRef, useState, useCallback } from 'react';

// Whiteboard with smooth line drawing algorithm from Krzysztof Zabłocki's LineDrawing
// https://www.merowing.info/drawing-smooth-lines-with-cocos2d-ios-inspired-by-paper/
// Implements: quadratic Bezier smoothing, speed-based width variation, anti-aliasing

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// LineDrawing algorithm implementation for 2D canvas
class SmoothLineDrawer {
  constructor() {
    this.overdraw = 3.0; // Extra pixels for anti-aliasing
    this.minSegmentDistance = 2;
    this.maxSegments = 128;
    this.minSegments = 32;
  }

  // Calculate distance between two points
  distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Easing function for smooth transitions
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // Calculate speed-based width for natural drawing feel
  calculateSpeedBasedWidth(baseWidth, speed, speedSensitivity = 0.5) {
    const maxSpeed = 100; // pixels per frame
    const normalizedSpeed = Math.min(speed / maxSpeed, 1);
    const easedSpeed = this.easeInOutQuad(normalizedSpeed);
    
    // Inverse relationship: faster = thinner, slower = thicker
    const minSpeedWidth = 0.5;
    const maxSpeedWidth = 1.5;
    const widthMultiplier = minSpeedWidth + (maxSpeedWidth - minSpeedWidth) * (1 - easedSpeed * speedSensitivity);
    
    return baseWidth * widthMultiplier;
  }

  // Calculate velocities between points
  calculateVelocities(points) {
    const velocities = [];
    
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        velocities.push(0);
      } else {
        velocities.push(this.distance(points[i - 1], points[i]));
      }
    }
    
    // Smooth velocities
    const smoothed = [];
    for (let i = 0; i < velocities.length; i++) {
      const prev = velocities[Math.max(0, i - 1)];
      const curr = velocities[i];
      const next = velocities[Math.min(velocities.length - 1, i + 1)];
      smoothed.push((prev + curr + next) / 3);
    }
    
    return smoothed;
  }

  // Quadratic Bezier interpolation: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
  quadraticBezier(p0, p1, p2, t) {
    const oneMinusT = 1 - t;
    return {
      x: oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x,
      y: oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y
    };
  }

  // Convert raw points to smoothed points with width variation
  // This follows the exact algorithm from the article
  pointsToSmoothedLine(points, baseWidth, speedSensitivity = 0.7) {
    if (points.length < 2) return [];
    
    const smoothedPoints = [];
    const velocities = this.calculateVelocities(points);
    
    if (points.length === 2) {
      // Simple case: just two points
      smoothedPoints.push({
        pos: points[0],
        width: this.calculateSpeedBasedWidth(baseWidth, velocities[0], speedSensitivity)
      });
      smoothedPoints.push({
        pos: points[1],
        width: this.calculateSpeedBasedWidth(baseWidth, velocities[1], speedSensitivity)
      });
    } else if (points.length > 2) {
      // Use quadratic Bezier with midpoints (from Krzysztof's algorithm)
      for (let i = 2; i < points.length; i++) {
        const prev2 = points[i - 2];
        const prev1 = points[i - 1];
        const cur = points[i];
        
        // Calculate midpoints
        const midPoint1 = {
          x: (prev1.x + prev2.x) * 0.5,
          y: (prev1.y + prev2.y) * 0.5
        };
        
        const midPoint2 = {
          x: (cur.x + prev1.x) * 0.5,
          y: (cur.y + prev1.y) * 0.5
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
          const point = this.quadraticBezier(midPoint1, prev1, midPoint2, t);
          
          // Calculate width with smooth interpolation
          const oneMinusT = 1 - t;
          const width1 = this.calculateSpeedBasedWidth(baseWidth, velocities[i - 2], speedSensitivity);
          const width2 = this.calculateSpeedBasedWidth(baseWidth, velocities[i - 1], speedSensitivity);
          const width3 = this.calculateSpeedBasedWidth(baseWidth, velocities[i], speedSensitivity);
          
          const width = oneMinusT * oneMinusT * (width1 + width2) * 0.5 + 
                       2.0 * oneMinusT * t * width2 + 
                       t * t * (width2 + width3) * 0.5;
          
          smoothedPoints.push({ pos: point, width });
          t += step;
        }
        
        // Add final point for this segment
        smoothedPoints.push({
          pos: midPoint2,
          width: this.calculateSpeedBasedWidth(baseWidth, velocities[i], speedSensitivity)
        });
      }
    }
    
    return smoothedPoints;
  }

  // Draw a smooth stroke on canvas with anti-aliasing
  drawSmoothedStroke(ctx, smoothedPoints, color, opacity) {
    if (smoothedPoints.length < 2) return;
    
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = opacity;
    
    // Draw the main stroke segments
    for (let i = 0; i < smoothedPoints.length - 1; i++) {
      const curr = smoothedPoints[i];
      const next = smoothedPoints[i + 1];
      
      // Calculate perpendicular direction for width
      const dx = next.pos.x - curr.pos.x;
      const dy = next.pos.y - curr.pos.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      
      if (len < 0.0001) continue;
      
      const perpX = -dy / len;
      const perpY = dx / len;
      
      // Draw main stroke as quad (filled path)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(curr.pos.x + perpX * curr.width / 2, curr.pos.y + perpY * curr.width / 2);
      ctx.lineTo(curr.pos.x - perpX * curr.width / 2, curr.pos.y - perpY * curr.width / 2);
      ctx.lineTo(next.pos.x - perpX * next.width / 2, next.pos.y - perpY * next.width / 2);
      ctx.lineTo(next.pos.x + perpX * next.width / 2, next.pos.y + perpY * next.width / 2);
      ctx.closePath();
      ctx.fill();
      
      // Anti-aliasing overdraw with faded edges
      const gradient1 = ctx.createLinearGradient(
        curr.pos.x + perpX * curr.width / 2,
        curr.pos.y + perpY * curr.width / 2,
        curr.pos.x + perpX * (curr.width / 2 + this.overdraw),
        curr.pos.y + perpY * (curr.width / 2 + this.overdraw)
      );
      gradient1.addColorStop(0, color);
      gradient1.addColorStop(1, color.replace(')', ', 0)').replace('rgb', 'rgba'));
      
      ctx.fillStyle = gradient1;
      ctx.beginPath();
      ctx.moveTo(curr.pos.x + perpX * curr.width / 2, curr.pos.y + perpY * curr.width / 2);
      ctx.lineTo(curr.pos.x + perpX * (curr.width / 2 + this.overdraw / 2), curr.pos.y + perpY * (curr.width / 2 + this.overdraw / 2));
      ctx.lineTo(next.pos.x + perpX * (next.width / 2 + this.overdraw / 2), next.pos.y + perpY * (next.width / 2 + this.overdraw / 2));
      ctx.lineTo(next.pos.x + perpX * next.width / 2, next.pos.y + perpY * next.width / 2);
      ctx.closePath();
      ctx.fill();
    }
    
    // Draw circular end caps
    for (const point of [smoothedPoints[0], smoothedPoints[smoothedPoints.length - 1]]) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.pos.x, point.pos.y, point.width / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}

export default function Whiteboard({
  onChange,
  onViewportChange,
  initialColor = '#000000',
  initialOpacity = 1,
  strokeWidth = 4,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const ctxRef = useRef(null);
  const smoothDrawerRef = useRef(new SmoothLineDrawer());

  const [tool, setTool] = useState('pencil'); // 'pencil' | 'eraser' | 'pan'
  const [color, setColor] = useState(initialColor);
  const [opacity, setOpacity] = useState(initialOpacity);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const strokesRef = useRef([]); // scene: array of strokes
  const currentStrokeRef = useRef(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(container.clientWidth * dpr);
    canvas.height = Math.floor(container.clientHeight * dpr);
    canvas.style.width = container.clientWidth + 'px';
    canvas.style.height = container.clientHeight + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
    redraw();
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const toWorld = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - offset.x) / zoom;
    const y = (clientY - rect.top - offset.y) / zoom;
    return { x, y };
  };

  const publishViewport = useCallback(() => {
    if (!onViewportChange) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const worldTopLeft = toWorld(rect.left, rect.top);
    const worldBottomRight = toWorld(rect.right, rect.bottom);
    onViewportChange({
      x: worldTopLeft.x,
      y: worldTopLeft.y,
      w: worldBottomRight.x - worldTopLeft.x,
      h: worldBottomRight.y - worldTopLeft.y
    });
  }, [zoom, offset, onViewportChange]);

  const redraw = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke);
    }
    if (currentStrokeRef.current) drawStroke(ctx, currentStrokeRef.current);

    ctx.restore();
  };

  const drawStroke = (ctx, stroke) => {
    if (!stroke.points.length) return;
    
    if (stroke.tool === 'eraser') {
      // Eraser: use simple line drawing
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // Pencil: use smooth line drawing algorithm
      const smoothedPoints = smoothDrawerRef.current.pointsToSmoothedLine(
        stroke.points,
        stroke.width,
        0.7 // speedSensitivity
      );
      
      if (smoothedPoints.length > 0) {
        smoothDrawerRef.current.drawSmoothedStroke(
          ctx,
          smoothedPoints,
          stroke.color,
          stroke.opacity
        );
      }
    }
  };

  const handlePointerDown = (e) => {
    const isPrimary = e.isPrimary !== false;
    if (!isPrimary) return;
    if (tool === 'pan') {
      isDrawingRef.current = true;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    isDrawingRef.current = true;
    const pt = toWorld(e.clientX, e.clientY);
    currentStrokeRef.current = {
      id: 's-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      tool,
      color,
      opacity,
      width: strokeWidth,
      points: [pt],
      timestamp: Date.now()
    };
    onChange?.({ 
      type: 'stroke-start', 
      stroke: currentStrokeRef.current,
      action: 'start',
      x: pt.x,
      y: pt.y,
      lineWidth: strokeWidth
    });
    redraw();
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    if (tool === 'pan') {
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
      // redraw will be triggered by offset state change effect
      return;
    }
    const pt = toWorld(e.clientX, e.clientY);
    currentStrokeRef.current.points.push(pt);
    onChange?.({ 
      type: 'stroke-append', 
      id: currentStrokeRef.current.id, 
      point: pt,
      action: 'move',
      x: pt.x,
      y: pt.y
    });
    redraw();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (tool !== 'pan' && currentStrokeRef.current) {
      strokesRef.current.push(currentStrokeRef.current);
      onChange?.({ 
        type: 'stroke-end', 
        stroke: currentStrokeRef.current, 
        scene: strokesRef.current,
        action: 'end',
        points: currentStrokeRef.current.points
      });
      currentStrokeRef.current = null;
      redraw();
    }
  };

  // Zoom with wheel + Ctrl/Cmd
  const handleWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return; // require modifier to zoom
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = clamp(zoom * factor, 0.1, 4);

    // zoom around cursor
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const wx = (cx - offset.x) / zoom;
    const wy = (cy - offset.y) / zoom;
    const nx = wx * newZoom + offset.x;
    const ny = wy * newZoom + offset.y;
    setOffset({ x: cx - nx, y: cy - ny });
    setZoom(newZoom);
  };

  useEffect(() => { redraw(); publishViewport(); }, [zoom, offset, publishViewport]);

  // Listen for remote drawing events from collaboration
  useEffect(() => {
    const handleRemoteDrawing = (event) => {
      const payload = event.detail || {};
      const evts = payload.events || [];
      // Reconstruct strokes incrementally
      for (const evt of evts) {
        if (evt.t === 's') {
          currentStrokeRef.current = {
            id: evt.i,
            tool: 'pencil',
            color: evt.c,
            opacity: evt.o,
            width: evt.w,
            points: [{ x: evt.x, y: evt.y }]
          };
        } else if (evt.t === 'a' && currentStrokeRef.current && currentStrokeRef.current.id === evt.i) {
          currentStrokeRef.current.points.push({ x: evt.x, y: evt.y });
        } else if (evt.t === 'e') {
          if (currentStrokeRef.current && currentStrokeRef.current.id === evt.i) {
            strokesRef.current.push(currentStrokeRef.current);
            currentStrokeRef.current = null;
            redraw();
          }
        }
      }
    };
    
    window.addEventListener('whiteboard-remote-batch', handleRemoteDrawing);
    const handleViewportRemote = (e) => {
      // Draw viewport rectangles of others (overlay)
      const { rect } = e.detail || {};
      if (!rect) return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      redraw();
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(zoom, zoom);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.7)';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([6 / zoom, 6 / zoom]);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    };
    window.addEventListener('whiteboard-viewport-remote', handleViewportRemote);
    
    return () => {
      window.removeEventListener('whiteboard-remote-batch', handleRemoteDrawing);
      window.removeEventListener('whiteboard-viewport-remote', handleViewportRemote);
    };
  }, []);

  // Simple footer controls inside component
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: '#0b0f14' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: tool === 'pan' ? 'grab' : 'crosshair', background: '#ffffff', borderRadius: 0, margin: 0 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 16,
          transform: 'translateX(-50%)',
          background: '#0d1117',
          borderRadius: 4,
          padding: '10px 14px',
          boxShadow: '0 0 8px rgba(0,209,255,0.6), 0 0 24px rgba(0,209,255,0.25)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          border: '1px solid #00d1ff33',
          backdropFilter: 'blur(6px)',
          maxWidth: '90vw',
          overflowX: 'auto'
        }}
      >
        <button 
          onClick={() => setTool('pencil')} 
          style={{ 
            padding: '8px 12px', 
            background: tool === 'pencil' ? '#0a1e28' : '#0f141b', 
            color: '#e5e7eb', 
            border: tool === 'pencil' ? '1px solid #00d1ff' : '1px solid #1f2937', 
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            transition: 'all 0.15s ease',
            boxShadow: tool === 'pencil' ? '0 0 6px rgba(0,209,255,0.8), 0 0 18px rgba(0,209,255,0.35)' : 'none'
          }}
        >✏️ Pencil</button>
        <button 
          onClick={() => setTool('eraser')} 
          style={{ 
            padding: '8px 12px', 
            background: tool === 'eraser' ? '#24160a' : '#0f141b', 
            color: '#e5e7eb', 
            border: tool === 'eraser' ? '1px solid #ff7a00' : '1px solid #1f2937', 
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            transition: 'all 0.15s ease',
            boxShadow: tool === 'eraser' ? '0 0 6px rgba(255,122,0,0.9), 0 0 18px rgba(255,122,0,0.35)' : 'none'
          }}
        >🧹 Eraser</button>
        <button 
          onClick={() => setTool('pan')} 
          style={{ 
            padding: '8px 12px', 
            background: tool === 'pan' ? '#0a1e28' : '#0f141b', 
            color: '#e5e7eb', 
            border: tool === 'pan' ? '1px solid #00d1ff' : '1px solid #1f2937', 
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            transition: 'all 0.15s ease',
            boxShadow: tool === 'pan' ? '0 0 6px rgba(0,209,255,0.8), 0 0 18px rgba(0,209,255,0.35)' : 'none'
          }}
        >🖐️ Pan</button>
        <div style={{ width: 1, height: 28, background: 'rgba(255, 255, 255, 0.2)', margin: '0 8px' }} />
        <input 
          type="color" 
          value={color} 
          onChange={(e) => setColor(e.target.value)} 
          style={{ 
            width: 36, 
            height: 36, 
            border: '1px solid #00d1ff33', 
            borderRadius: 4, 
            cursor: 'pointer',
            background: 'transparent'
          }}
        />
        <input 
          title="Opacity" 
          type="range" 
          min={0.1} 
          max={1} 
          step={0.05} 
          value={opacity} 
          onChange={(e) => setOpacity(parseFloat(e.target.value))} 
          style={{
            width: 100,
            accentColor: '#00d1ff'
          }}
        />
        <input 
          title="Brush" 
          type="range" 
          min={1} 
          max={24} 
          step={1} 
          value={strokeWidth} 
          onChange={() => {}}
          style={{ width: 100, accentColor: '#ff7a00' }}
        />
        <span style={{ 
          fontSize: 13, 
          color: '#e5e7eb', 
          fontWeight: 600,
          minWidth: 50,
          textAlign: 'center',
          background: '#0f141b',
          padding: '6px 10px',
          borderRadius: 4,
          border: '1px solid #1f2937'
        }}>{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}


