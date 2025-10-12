# Open Source Drawing Tools Research

## Current System
Your app currently uses:
- **Three.js** for WebGL rendering
- **Custom brush engine** with effects (glow, sparkle, rainbow, pulse)
- **Custom drawing implementation** using Three.js Line objects

## Top Open Source Drawing Library Recommendations

### 1. ⭐ **tldraw** (HIGHLY RECOMMENDED)
**GitHub:** https://github.com/tldraw/tldraw  
**License:** Apache 2.0  
**Stars:** ~30k+

#### Pros:
- ✅ Modern, actively maintained (2024)
- ✅ Built specifically for collaborative whiteboards
- ✅ Excellent performance with large canvases
- ✅ Built-in multiplayer/sync support
- ✅ TypeScript-first with great type safety
- ✅ Beautiful, polished UI out of the box
- ✅ Extensible tool system
- ✅ Great documentation and examples
- ✅ Production-ready (used by many companies)
- ✅ Supports custom shapes and tools
- ✅ Mobile-friendly touch support

#### Cons:
- ⚠️ Less emphasis on artistic brushes (more diagram-focused)
- ⚠️ Larger bundle size due to feature completeness

#### Integration Effort: **Medium**
Would require replacing Three.js with tldraw's canvas system, but provides collaboration features out of the box.

**Best For:** Professional collaborative whiteboard applications

---

### 2. ⭐ **Excalidraw** (EXCELLENT CHOICE)
**GitHub:** https://github.com/excalidraw/excalidraw  
**License:** MIT  
**Stars:** ~75k+

#### Pros:
- ✅ Extremely popular and battle-tested
- ✅ Beautiful hand-drawn aesthetic
- ✅ Built-in collaboration support
- ✅ Can be used as a library or standalone
- ✅ Great mobile support
- ✅ Active development and community
- ✅ Excellent documentation
- ✅ Real-time collaboration built-in
- ✅ Open-source with commercial-friendly license
- ✅ Plugin system for extensions

#### Cons:
- ⚠️ More focused on diagrams than freehand drawing
- ⚠️ Hand-drawn style may not fit all use cases

#### Integration Effort: **Low to Medium**
Can be embedded as a React component with minimal setup.

**Best For:** Collaborative sketching and diagramming with a unique aesthetic

---

### 3. **Perfect Freehand**
**GitHub:** https://github.com/steveruizok/perfect-freehand  
**License:** MIT  
**Stars:** ~4k+

#### Pros:
- ✅ Specifically designed for beautiful freehand drawing
- ✅ Lightweight and fast
- ✅ Pressure sensitivity support
- ✅ Works with any rendering system (Canvas, SVG, WebGL)
- ✅ Created by tldraw author (Steve Ruiz)
- ✅ Simple API
- ✅ Great for artistic/natural drawing feel
- ✅ Can integrate with your existing Three.js setup

#### Cons:
- ⚠️ Lower-level library (needs more custom code)
- ⚠️ No built-in UI or tools
- ⚠️ No collaboration features (DIY)

#### Integration Effort: **High**
Would need to build UI and tools around it, but can work with existing Three.js setup.

**Best For:** Apps that need beautiful freehand strokes with custom UI

---

### 4. **Fabric.js**
**GitHub:** https://github.com/fabricjs/fabric.js  
**License:** MIT  
**Stars:** ~28k+

#### Pros:
- ✅ Mature and stable (10+ years)
- ✅ Very feature-rich
- ✅ Great for complex canvas applications
- ✅ Supports free drawing, shapes, text, images
- ✅ Good documentation and examples
- ✅ Active community
- ✅ Serialization/deserialization built-in
- ✅ Extensive API for customization

#### Cons:
- ⚠️ Older codebase (not TypeScript native)
- ⚠️ Canvas 2D only (not WebGL/Three.js compatible)
- ⚠️ No built-in collaboration
- ⚠️ Heavier bundle size

#### Integration Effort: **High**
Would require complete replacement of Three.js rendering system.

**Best For:** Feature-rich 2D canvas applications without WebGL requirements

---

### 5. **Konva.js**
**GitHub:** https://github.com/konvajs/konva  
**License:** MIT  
**Stars:** ~11k+

#### Pros:
- ✅ HTML5 Canvas library with drawing support
- ✅ Good performance
- ✅ Event handling built-in
- ✅ Supports animations and transitions
- ✅ Layer-based approach
- ✅ TypeScript support
- ✅ Works with React, Vue, Angular

#### Cons:
- ⚠️ Canvas 2D only
- ⚠️ No built-in collaboration
- ⚠️ Less focused on freehand drawing

#### Integration Effort: **High**
Would need to replace Three.js system.

**Best For:** Interactive canvas applications with shapes and objects

---

### 6. **Paper.js**
**GitHub:** https://github.com/paperjs/paper.js  
**License:** MIT  
**Stars:** ~14k+

#### Pros:
- ✅ Vector graphics scripting framework
- ✅ Beautiful API design
- ✅ Great for artistic/creative applications
- ✅ Path manipulation tools
- ✅ Animation support
- ✅ Well documented

#### Cons:
- ⚠️ Development has slowed down
- ⚠️ Canvas 2D only
- ⚠️ No built-in collaboration
- ⚠️ Learning curve for the unique API

#### Integration Effort: **High**

**Best For:** Vector-based artistic applications

---

### 7. **Rough.js** + **RoughNotation**
**GitHub:** https://github.com/rough-stuff/rough  
**License:** MIT  
**Stars:** ~19k+

#### Pros:
- ✅ Creates hand-drawn, sketchy graphics
- ✅ Unique visual style
- ✅ Works with Canvas, SVG, or any rendering
- ✅ Lightweight
- ✅ Easy to use

#### Cons:
- ⚠️ Very specific aesthetic
- ⚠️ Not a complete drawing solution (helper library)
- ⚠️ No collaboration features

#### Integration Effort: **Medium to High**

**Best For:** Adding hand-drawn aesthetic to existing graphics

---

## Comparison Matrix

| Library | Collab Support | Bundle Size | Learning Curve | TypeScript | Maintenance | Best For |
|---------|---------------|-------------|----------------|------------|-------------|----------|
| **tldraw** | ✅ Built-in | Large | Medium | ✅ Native | ⭐⭐⭐⭐⭐ | Collaborative whiteboard |
| **Excalidraw** | ✅ Built-in | Large | Low | ✅ Yes | ⭐⭐⭐⭐⭐ | Collaborative sketching |
| **Perfect Freehand** | ❌ DIY | Small | Medium | ✅ Yes | ⭐⭐⭐⭐ | Beautiful freehand |
| **Fabric.js** | ❌ DIY | Medium | Medium | ⚠️ Partial | ⭐⭐⭐⭐ | Feature-rich 2D |
| **Konva.js** | ❌ DIY | Medium | Low | ✅ Yes | ⭐⭐⭐⭐ | Interactive canvas |
| **Paper.js** | ❌ DIY | Medium | High | ❌ No | ⭐⭐⭐ | Vector art |
| **Rough.js** | ❌ DIY | Small | Low | ✅ Yes | ⭐⭐⭐ | Sketchy style |

---

## My Top 3 Recommendations for Your Project

### 🥇 **#1: tldraw**
**Why:** Since you already have collaboration features (Azure Web PubSub), tldraw's built-in sync capabilities could replace both your drawing AND collaboration code. It's modern, actively maintained, and production-ready.

**Migration Path:**
1. Install `@tldraw/tldraw`
2. Replace Three.js canvas with tldraw editor
3. Connect tldraw's sync to your existing Web PubSub
4. Customize tools and UI to match your needs

**Estimated Effort:** 2-3 days for basic integration

---

### 🥈 **#2: Excalidraw**
**Why:** If you want a unique hand-drawn aesthetic and don't mind the opinionated style, Excalidraw is battle-tested with millions of users. Great collaboration support out of the box.

**Migration Path:**
1. Install `@excalidraw/excalidraw`
2. Embed as React component
3. Use Excalidraw's collaboration features or integrate with Web PubSub
4. Customize appearance via themes

**Estimated Effort:** 1-2 days for basic integration

---

### 🥉 **#3: Perfect Freehand + Keep Your Architecture**
**Why:** If you love your current architecture and just want better stroke rendering, Perfect Freehand can integrate with your existing Three.js setup.

**Migration Path:**
1. Install `perfect-freehand`
2. Replace line drawing logic with Perfect Freehand
3. Keep Three.js rendering
4. Keep existing collaboration code

**Estimated Effort:** 1 day

---

## Other Notable Mentions

### **Signature Pad**
- Great for signatures and simple drawing
- Very lightweight
- GitHub: https://github.com/szimek/signature_pad

### **p5.js**
- Creative coding framework
- Great for artistic applications
- GitHub: https://github.com/processing/p5.js

### **Two.js**
- 2D drawing API
- Multiple renderer support (Canvas, SVG, WebGL)
- GitHub: https://github.com/jonobr1/two.js

---

## Implementation Example: tldraw

Here's a quick example of how you might integrate tldraw:

```bash
npm install @tldraw/tldraw
```

```tsx
import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function DrawingApp() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw
        // Add your collaboration store here
        // Customize tools, UI, etc.
      />
    </div>
  )
}
```

---

## Next Steps

1. **Try demos:**
   - tldraw: https://www.tldraw.com
   - Excalidraw: https://excalidraw.com
   - Perfect Freehand: https://perfect-freehand-example.vercel.app

2. **Evaluate based on:**
   - Drawing feel (try each with a drawing tablet if available)
   - Performance with many strokes
   - Ease of integration
   - Documentation quality
   - Community support

3. **Prototype:**
   - Create a quick proof-of-concept with your top choice
   - Test collaboration features
   - Verify mobile support
   - Check bundle size impact

---

## My Final Recommendation

For your collaborative drawing app, I'd recommend **tldraw** because:

1. ✅ You get collaboration out of the box
2. ✅ Modern, TypeScript-first codebase
3. ✅ Actively maintained by a great team
4. ✅ Extensible and customizable
5. ✅ Production-ready with great performance
6. ✅ Can simplify your codebase significantly

However, if you prefer the current Three.js architecture and just want better drawing, go with **Perfect Freehand** for a lighter-weight integration.

If you want something fun and different with a unique aesthetic, **Excalidraw** is fantastic.

---

## Questions to Consider

1. **Do you need WebGL/3D capabilities?** If yes, Perfect Freehand might be better.
2. **How important is the hand-drawn aesthetic?** If very, consider Excalidraw.
3. **Do you want to simplify your codebase?** If yes, tldraw can replace lots of custom code.
4. **What's your target bundle size?** Perfect Freehand is smallest, tldraw/Excalidraw are larger.
5. **How much customization do you need?** All are customizable, but tldraw is most flexible.

Let me know which direction interests you most, and I can help with the integration!
