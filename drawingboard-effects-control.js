// Custom Effects Control for DrawingBoard.js
DrawingBoard.Control.Effects = DrawingBoard.Control.extend({
    name: 'effects',
    
    defaults: {
        effects: ['glow', 'rainbow', 'pattern', 'sparkle']
    },
    
    initialize: function() {
        this.board = arguments[0];
        this.opts = $.extend({}, this.defaults, arguments[1]);
        
        // Track active effects
        this.activeEffects = new Set();
        this.rainbowHue = 0;
        this.patternCache = {};
        
        // Create control UI
        this.$el = $('<div class="drawing-board-control drawing-board-control-effects"></div>');
        this.createUI();
        
        // Bind to drawing events
        this.bindEvents();
    },
    
    createUI: function() {
        var self = this;
        var $container = $('<div class="drawing-board-control-effects-container"></div>');
        
        // Create toggle buttons for each effect
        this.opts.effects.forEach(function(effect) {
            var $button = $('<button class="drawing-board-control-effects-button" data-effect="' + effect + '">' + 
                self.getEffectIcon(effect) + '</button>');
            
            $button.on('click', function() {
                self.toggleEffect(effect);
                $(this).toggleClass('active');
            });
            
            $container.append($button);
        });
        
        this.$el.append($container);
    },
    
    getEffectIcon: function(effect) {
        var icons = {
            'glow': '✨',
            'rainbow': '🌈',
            'pattern': '🔲',
            'sparkle': '⭐'
        };
        return icons[effect] || '✦';
    },
    
    toggleEffect: function(effect) {
        if (this.activeEffects.has(effect)) {
            this.activeEffects.delete(effect);
            this.deactivateEffect(effect);
        } else {
            this.activeEffects.add(effect);
            this.activateEffect(effect);
        }
    },
    
    activateEffect: function(effect) {
        var self = this;
        
        switch(effect) {
            case 'glow':
                this.originalShadowBlur = this.board.ctx.shadowBlur;
                this.originalShadowColor = this.board.ctx.shadowColor;
                break;
                
            case 'rainbow':
                this.rainbowInterval = setInterval(function() {
                    self.rainbowHue = (self.rainbowHue + 2) % 360;
                }, 50);
                break;
                
            case 'pattern':
                this.createPatterns();
                break;
                
            case 'sparkle':
                this.sparkles = [];
                this.sparkleCanvas = document.createElement('canvas');
                this.sparkleCanvas.width = this.board.canvas.width;
                this.sparkleCanvas.height = this.board.canvas.height;
                this.sparkleCtx = this.sparkleCanvas.getContext('2d');
                this.startSparkleAnimation();
                break;
        }
    },
    
    deactivateEffect: function(effect) {
        switch(effect) {
            case 'glow':
                this.board.ctx.shadowBlur = 0;
                this.board.ctx.shadowColor = 'transparent';
                break;
                
            case 'rainbow':
                if (this.rainbowInterval) {
                    clearInterval(this.rainbowInterval);
                    this.rainbowInterval = null;
                }
                break;
                
            case 'sparkle':
                this.stopSparkleAnimation();
                break;
        }
    },
    
    bindEvents: function() {
        var self = this;
        
        // Override drawing behavior
        this.board.ev.bind('board:drawing', function(e) {
            self.applyActiveEffects(e);
        });
        
        this.board.ev.bind('board:startDrawing', function(e) {
            self.onDrawStart(e);
        });
        
        this.board.ev.bind('board:stopDrawing', function(e) {
            self.onDrawEnd(e);
        });
    },
    
    applyActiveEffects: function(e) {
        var ctx = this.board.ctx;
        
        if (this.activeEffects.has('glow')) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = ctx.strokeStyle;
        }
        
        if (this.activeEffects.has('rainbow')) {
            ctx.strokeStyle = 'hsl(' + this.rainbowHue + ', 100%, 50%)';
        }
        
        if (this.activeEffects.has('pattern') && this.currentPattern) {
            ctx.strokeStyle = this.currentPattern;
        }
        
        if (this.activeEffects.has('sparkle')) {
            this.addSparkles(e.coords.x, e.coords.y);
        }
    },
    
    createPatterns: function() {
        var patternCanvas = document.createElement('canvas');
        patternCanvas.width = 20;
        patternCanvas.height = 20;
        var pctx = patternCanvas.getContext('2d');
        
        // Dots pattern
        pctx.fillStyle = this.board.color;
        for (var x = 0; x < 20; x += 5) {
            for (var y = 0; y < 20; y += 5) {
                pctx.fillRect(x, y, 2, 2);
            }
        }
        
        this.currentPattern = this.board.ctx.createPattern(patternCanvas, 'repeat');
    },
    
    addSparkles: function(x, y) {
        for (var i = 0; i < 3; i++) {
            this.sparkles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                size: Math.random() * 3 + 1,
                life: 1.0,
                decay: Math.random() * 0.02 + 0.01
            });
        }
    },
    
    startSparkleAnimation: function() {
        var self = this;
        
        this.sparkleAnimation = function() {
            if (!self.activeEffects.has('sparkle')) return;
            
            // Clear sparkle canvas
            self.sparkleCtx.clearRect(0, 0, self.sparkleCanvas.width, self.sparkleCanvas.height);
            
            // Update and draw sparkles
            self.sparkles = self.sparkles.filter(function(sparkle) {
                sparkle.life -= sparkle.decay;
                if (sparkle.life <= 0) return false;
                
                self.sparkleCtx.save();
                self.sparkleCtx.globalAlpha = sparkle.life;
                self.sparkleCtx.fillStyle = '#ffffff';
                self.sparkleCtx.shadowBlur = sparkle.size * 2;
                self.sparkleCtx.shadowColor = '#ffffff';
                
                // Draw star
                self.drawStar(self.sparkleCtx, sparkle.x, sparkle.y, sparkle.size);
                self.sparkleCtx.restore();
                
                return true;
            });
            
            // Composite sparkles on main canvas
            self.board.ctx.save();
            self.board.ctx.globalCompositeOperation = 'screen';
            self.board.ctx.drawImage(self.sparkleCanvas, 0, 0);
            self.board.ctx.restore();
            
            requestAnimationFrame(self.sparkleAnimation);
        };
        
        requestAnimationFrame(this.sparkleAnimation);
    },
    
    stopSparkleAnimation: function() {
        this.sparkles = [];
        if (this.sparkleCtx) {
            this.sparkleCtx.clearRect(0, 0, this.sparkleCanvas.width, this.sparkleCanvas.height);
        }
    },
    
    drawStar: function(ctx, cx, cy, size) {
        var spikes = 4;
        var innerRadius = size * 0.4;
        var outerRadius = size;
        
        ctx.beginPath();
        for (var i = 0; i < spikes * 2; i++) {
            var angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
            var radius = i % 2 === 0 ? outerRadius : innerRadius;
            var x = cx + Math.cos(angle) * radius;
            var y = cy + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
    },
    
    onDrawStart: function(e) {
        // Any initialization needed when drawing starts
    },
    
    onDrawEnd: function(e) {
        // Clean up after drawing ends
        if (this.activeEffects.has('glow')) {
            this.board.ctx.shadowBlur = 0;
        }
    }
});

// Add CSS for the effects control
var effectsCSS = `
<style>
.drawing-board-control-effects-container {
    display: flex;
    gap: 5px;
}

.drawing-board-control-effects-button {
    width: 35px;
    height: 35px;
    border: 2px solid #ddd;
    background: white;
    border-radius: 5px;
    cursor: pointer;
    font-size: 18px;
    transition: all 0.2s;
}

.drawing-board-control-effects-button:hover {
    background: #f0f0f0;
    transform: translateY(-2px);
}

.drawing-board-control-effects-button.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-color: transparent;
    transform: scale(1.1);
}
</style>
`;

$('head').append(effectsCSS);