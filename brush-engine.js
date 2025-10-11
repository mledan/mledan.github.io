// Brush Engine - Handles all brush types, effects, and drawing properties

class BrushEngine {
    constructor() {
        this.currentBrush = 'pencil';
        this.currentColor = '#000000';
        this.brushSize = 5;
        this.brushOpacity = 1.0;
        this.activeEffects = new Set();
        this.strokeHistory = [];
        this.redoHistory = [];
        this.rainbowHue = 0;
        this.sparkles = [];
        this.pulsePhase = 0;
        
        this.brushPresets = {
            pencil: {
                baseWidth: 1,
                opacity: 1,
                smoothing: 0.2,
                hardness: 0.9
            },
            marker: {
                baseWidth: 3,
                opacity: 0.7,
                smoothing: 0.5,
                hardness: 0.3
            },
            airbrush: {
                baseWidth: 5,
                opacity: 0.3,
                smoothing: 0.8,
                hardness: 0.1,
                scatter: true
            },
            glow: {
                baseWidth: 4,
                opacity: 0.6,
                smoothing: 0.7,
                hardness: 0,
                glowRadius: 20,
                glowIntensity: 0.5
            },
            sparkle: {
                baseWidth: 2,
                opacity: 0.8,
                smoothing: 0.3,
                hardness: 0.5,
                sparkleCount: 5,
                sparkleSize: 3
            },
            rainbow: {
                baseWidth: 3,
                opacity: 0.9,
                smoothing: 0.5,
                hardness: 0.4,
                rainbowSpeed: 2
            },
            eraser: {
                baseWidth: 3,
                opacity: 1,
                smoothing: 0.3,
                hardness: 1,
                blendMode: 'destination-out'
            }
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.animationLoop();
    }
    
    setupEventListeners() {
        // Brush preset selection
        document.querySelectorAll('.brush-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.brush-preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentBrush = btn.dataset.brush;
            });
        });
        
        // Color selection
        document.getElementById('color-picker').addEventListener('change', (e) => {
            this.currentColor = e.target.value;
            document.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
        });
        
        document.querySelectorAll('.color-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentColor = btn.dataset.color;
                document.getElementById('color-picker').value = this.currentColor;
            });
        });
        
        // Brush properties
        document.getElementById('brush-size').addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            document.getElementById('size-value').textContent = this.brushSize;
        });
        
        document.getElementById('brush-opacity').addEventListener('input', (e) => {
            this.brushOpacity = parseInt(e.target.value) / 100;
            document.getElementById('opacity-value').textContent = e.target.value + '%';
        });
        
        // Effects toggles
        document.querySelectorAll('.effect-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const effect = btn.dataset.effect;
                btn.classList.toggle('active');
                
                if (btn.classList.contains('active')) {
                    this.activeEffects.add(effect);
                } else {
                    this.activeEffects.delete(effect);
                }
            });
        });
        
        // Toolbar actions
        document.getElementById('clear-canvas').addEventListener('click', () => {
            this.clearCanvas();
        });
        
        document.getElementById('undo-action').addEventListener('click', () => {
            this.undo();
        });
        
        document.getElementById('redo-action').addEventListener('click', () => {
            this.redo();
        });
    }
    
    getBrushProperties() {
        const preset = this.brushPresets[this.currentBrush] || this.brushPresets.pencil;
        const props = {
            ...preset,
            color: this.currentColor,
            width: this.brushSize * preset.baseWidth,
            opacity: this.brushOpacity * preset.opacity,
            effects: [...this.activeEffects]
        };
        
        // Apply rainbow effect
        if (this.activeEffects.has('rainbow')) {
            props.color = this.getRainbowColor();
        }
        
        // Apply pulse effect
        if (this.activeEffects.has('pulse')) {
            const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
            props.width *= pulse;
            props.opacity *= pulse;
        }
        
        return props;
    }
    
    getRainbowColor() {
        this.rainbowHue = (this.rainbowHue + 2) % 360;
        return `hsl(${this.rainbowHue}, 100%, 50%)`;
    }
    
    createGlowEffect(ctx, x, y, radius, color, intensity) {
        if (!this.activeEffects.has('glow') && this.currentBrush !== 'glow') return;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const rgba = this.hexToRgba(color, intensity);
        gradient.addColorStop(0, rgba);
        gradient.addColorStop(0.5, this.hexToRgba(color, intensity * 0.5));
        gradient.addColorStop(1, this.hexToRgba(color, 0));
        
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        ctx.restore();
    }
    
    createSparkles(ctx, x, y, count, size) {
        if (!this.activeEffects.has('sparkle') && this.currentBrush !== 'sparkle') return;
        
        for (let i = 0; i < count; i++) {
            const sparkle = {
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                size: Math.random() * size + 1,
                life: 1.0,
                decay: Math.random() * 0.02 + 0.01,
                color: this.currentColor
            };
            this.sparkles.push(sparkle);
        }
    }
    
    updateSparkles(ctx) {
        this.sparkles = this.sparkles.filter(sparkle => {
            sparkle.life -= sparkle.decay;
            if (sparkle.life <= 0) return false;
            
            ctx.save();
            ctx.globalAlpha = sparkle.life;
            ctx.fillStyle = sparkle.color;
            ctx.shadowBlur = sparkle.size * 2;
            ctx.shadowColor = sparkle.color;
            
            // Draw a star shape
            this.drawStar(ctx, sparkle.x, sparkle.y, sparkle.size);
            ctx.restore();
            
            return true;
        });
    }
    
    drawStar(ctx, cx, cy, size) {
        const spikes = 4;
        const innerRadius = size * 0.4;
        const outerRadius = size;
        
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
    }
    
    applyAirbrushEffect(ctx, x, y, radius, color, opacity) {
        if (this.currentBrush !== 'airbrush') return;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, this.hexToRgba(color, opacity));
        gradient.addColorStop(0.5, this.hexToRgba(color, opacity * 0.5));
        gradient.addColorStop(1, this.hexToRgba(color, 0));
        
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = gradient;
        
        // Add scatter effect
        for (let i = 0; i < 10; i++) {
            const scatterX = x + (Math.random() - 0.5) * radius * 2;
            const scatterY = y + (Math.random() - 0.5) * radius * 2;
            const scatterRadius = Math.random() * radius * 0.5;
            
            ctx.beginPath();
            ctx.arc(scatterX, scatterY, scatterRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    animationLoop() {
        requestAnimationFrame(() => {
            this.pulsePhase += 0.1;
            this.animationLoop();
        });
    }
    
    clearCanvas() {
        if (window.drawingApp && window.drawingApp.clearCanvas) {
            window.drawingApp.clearCanvas();
        }
        this.strokeHistory = [];
        this.redoHistory = [];
        this.sparkles = [];
    }
    
    undo() {
        if (this.strokeHistory.length > 0) {
            const lastStroke = this.strokeHistory.pop();
            this.redoHistory.push(lastStroke);
            // Trigger canvas redraw
            if (window.drawingApp && window.drawingApp.undo) {
                window.drawingApp.undo();
            }
        }
    }
    
    redo() {
        if (this.redoHistory.length > 0) {
            const stroke = this.redoHistory.pop();
            this.strokeHistory.push(stroke);
            // Trigger canvas redraw
            if (window.drawingApp && window.drawingApp.redo) {
                window.drawingApp.redo();
            }
        }
    }
    
    // Integration with Three.js drawing
    createBrushMaterial(properties) {
        if (typeof THREE === 'undefined') return null;
        
        const material = new THREE.LineBasicMaterial({
            color: properties.color,
            opacity: properties.opacity,
            transparent: true,
            linewidth: properties.width
        });
        
        // Add custom shader for special effects if needed
        if (properties.effects.includes('glow')) {
            // Custom shader for glow effect would go here
            material.emissive = new THREE.Color(properties.color);
            material.emissiveIntensity = 0.5;
        }
        
        return material;
    }
    
    // Method to get current brush state for the drawing app
    getCurrentBrushState() {
        return {
            brush: this.currentBrush,
            properties: this.getBrushProperties(),
            sparkles: [...this.sparkles]
        };
    }
}

// Initialize the brush engine when the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.brushEngine = new BrushEngine();
    });
} else {
    window.brushEngine = new BrushEngine();
}