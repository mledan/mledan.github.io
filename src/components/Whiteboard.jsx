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
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: tool === 'pan' ? 'grab' : 'crosshair', background: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', margin: '8px' }}
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
          bottom: 24,
          transform: 'translateX(-50%)',
          background: 'linear-gradient(145deg, rgba(30, 30, 60, 0.95), rgba(20, 20, 40, 0.95))',
          borderRadius: 16,
          padding: '12px 18px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(102, 126, 234, 0.3)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <button 
          onClick={() => setTool('pencil')} 
          style={{ 
            padding: '8px 14px', 
            background: tool === 'pencil' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255, 255, 255, 0.1)', 
            color: '#fff', 
            border: tool === 'pencil' ? 'none' : '1px solid rgba(255, 255, 255, 0.2)', 
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            transition: 'all 0.3s ease',
            boxShadow: tool === 'pencil' ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none'
          }}
        >✏️ Pencil</button>
        <button 
          onClick={() => setTool('eraser')} 
          style={{ 
            padding: '8px 14px', 
            background: tool === 'eraser' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 'rgba(255, 255, 255, 0.1)', 
            color: '#fff', 
            border: tool === 'eraser' ? 'none' : '1px solid rgba(255, 255, 255, 0.2)', 
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            transition: 'all 0.3s ease',
            boxShadow: tool === 'eraser' ? '0 4px 15px rgba(240, 93, 251, 0.4)' : 'none'
          }}
        >🧹 Eraser</button>
        <button 
          onClick={() => setTool('pan')} 
          style={{ 
            padding: '8px 14px', 
            background: tool === 'pan' ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : 'rgba(255, 255, 255, 0.1)', 
            color: '#fff', 
            border: tool === 'pan' ? 'none' : '1px solid rgba(255, 255, 255, 0.2)', 
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            transition: 'all 0.3s ease',
            boxShadow: tool === 'pan' ? '0 4px 15px rgba(56, 239, 125, 0.4)' : 'none'
          }}
        >🖐️ Pan</button>
        <div style={{ width: 1, height: 28, background: 'rgba(255, 255, 255, 0.2)', margin: '0 8px' }} />
        <input 
          type="color" 
          value={color} 
          onChange={(e) => setColor(e.target.value)} 
          style={{ 
            width: 40, 
            height: 40, 
            border: '2px solid rgba(255, 255, 255, 0.3)', 
            borderRadius: 10, 
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
            accentColor: '#667eea'
          }}
        />
        <span style={{ 
          fontSize: 13, 
          color: '#fff', 
          fontWeight: '600',
          minWidth: 50,
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '6px 10px',
          borderRadius: 8
        }}>{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}


