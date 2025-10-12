import React, { useEffect, useRef, useState, useCallback } from 'react';

// Minimal whiteboard: pencil, eraser, pan/zoom, color & opacity
// Emits onChange with incremental stroke events and full scene on end

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function Whiteboard({
  onChange,
  initialColor = '#000000',
  initialOpacity = 1,
  strokeWidth = 2,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const ctxRef = useRef(null);

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
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = stroke.width;
    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.globalAlpha = stroke.opacity;
    }
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
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
    };
    onChange?.({ type: 'stroke-start', stroke: currentStrokeRef.current });
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
    onChange?.({ type: 'stroke-append', id: currentStrokeRef.current.id, point: pt });
    redraw();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (tool !== 'pan' && currentStrokeRef.current) {
      strokesRef.current.push(currentStrokeRef.current);
      onChange?.({ type: 'stroke-end', stroke: currentStrokeRef.current, scene: strokesRef.current });
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

  useEffect(() => { redraw(); }, [zoom, offset]);

  // Simple footer controls inside component
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: '#fff' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: tool === 'pan' ? 'grab' : 'crosshair' }}
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
          bottom: 12,
          transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 12,
          padding: '8px 12px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <button onClick={() => setTool('pencil')} style={{ padding: '6px 10px', background: tool === 'pencil' ? '#2563eb' : '#e5e7eb', color: tool === 'pencil' ? '#fff' : '#111', border: 'none', borderRadius: 8 }}>Pencil</button>
        <button onClick={() => setTool('eraser')} style={{ padding: '6px 10px', background: tool === 'eraser' ? '#2563eb' : '#e5e7eb', color: tool === 'eraser' ? '#fff' : '#111', border: 'none', borderRadius: 8 }}>Eraser</button>
        <button onClick={() => setTool('pan')} style={{ padding: '6px 10px', background: tool === 'pan' ? '#2563eb' : '#e5e7eb', color: tool === 'pan' ? '#fff' : '#111', border: 'none', borderRadius: 8 }}>Pan</button>
        <div style={{ width: 1, height: 24, background: '#ddd', margin: '0 8px' }} />
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <input title="Opacity" type="range" min={0.1} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} />
        <span style={{ fontSize: 12, color: '#444' }}>{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}


