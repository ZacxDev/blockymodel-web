# BlockyModel Web Viewer - Product Requirements Document

## Executive Summary

A web-based rendering solution for `.blockymodel` files (Hytale's native 3D model format). The viewer will parse blockymodel JSON, construct hierarchical bone structures with box/quad primitives, apply texture mapping, and provide interactive 3D viewing with optional animation playback.

---

## Problem Statement

Hytale modders and content creators need a browser-based tool to preview `.blockymodel` files without requiring Hytale Model Maker or Blockbench. Current solutions require desktop application installation, limiting accessibility and collaboration workflows.

---

## Goals

| Goal | Success Metric |
|------|----------------|
| Parse and render any valid `.blockymodel` file | 100% compatibility with format spec |
| Interactive 3D viewing (rotate, zoom, pan) | <16ms frame time @ 60fps |
| Texture support | Correct UV mapping for all 6 box faces |
| Animation playback (`.blockyanim`) | Smooth interpolation at 60 ticks/sec |
| Accessible via URL | No installation required |

---

## Non-Goals (v1.0)

- Model editing capabilities
- Export to other formats (GLTF, OBJ)
- Multi-model scene composition
- Real-time lighting adjustments
- Mobile-optimized touch controls

---

## Technical Architecture

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **3D Rendering** | Three.js | Best custom loader support, smallest bundle, proven voxel patterns, largest community |
| **UI Framework** | Vanilla JS or Preact | Minimize bundle for viewer-focused app |
| **Build Tool** | Vite | Fast HMR, native ES modules, excellent tree-shaking |
| **Language** | TypeScript | Type safety for complex geometry/animation math |

### Why Three.js Over Alternatives

| Criteria | Three.js | Babylon.js | PlayCanvas |
|----------|----------|------------|------------|
| Custom Loader Ease | ★★★★★ | ★★★☆☆ | ★★☆☆☆ |
| Bundle Size | ~400KB | ~700KB+ | ~500KB |
| Voxel Patterns | Extensive | Good | Limited |
| Animation System | Mature | Mature | Good |
| WebGPU Ready | Experimental | Production | Beta |

---

## BlockyModel Format Specification

### Root Structure

```typescript
interface BlockyModel {
  lod?: "auto" | string;
  format?: "character" | "prop";
  nodes: BlockyNode[];
}
```

### Node Structure

```typescript
interface BlockyNode {
  id: string;
  name: string;
  position?: Vec3;           // Default: {x:0, y:0, z:0}
  orientation?: Quaternion;  // WXYZ format, default: identity
  shape: BlockyShape;
  children: BlockyNode[];
}

interface Vec3 { x: number; y: number; z: number; }
interface Quaternion { w: number; x: number; y: number; z: number; }
```

### Shape Structure

```typescript
interface BlockyShape {
  type: "box" | "quad" | "none";
  offset: Vec3;
  stretch: Vec3;              // Scale multiplier
  settings: ShapeSettings;
  textureLayout: TextureLayout;
  unwrapMode: "custom" | "auto";
  visible: boolean;
  doubleSided: boolean;
  shadingMode: "standard" | "flat" | "fullbright" | "reflective";
}

interface ShapeSettings {
  size?: Vec3;                // Dimensions for box/quad
  normal?: "+X"|"-X"|"+Y"|"-Y"|"+Z"|"-Z";  // For quads
  isPiece?: boolean;          // Attachment point marker
  isStaticBox?: boolean;
}

interface TextureLayout {
  front?: FaceUV;
  back?: FaceUV;
  left?: FaceUV;
  right?: FaceUV;
  top?: FaceUV;
  bottom?: FaceUV;
}

interface FaceUV {
  offset: { x: number; y: number };  // Pixel offset in texture
  mirror: { x: boolean; y: boolean };
  angle: 0 | 90 | 180 | 270;
}
```

### Animation Format (`.blockyanim`)

```typescript
interface BlockyAnimation {
  formatVersion: number;
  duration: number;           // Ticks at 60fps
  holdLastKeyframe: boolean;
  nodeAnimations: {
    [nodeName: string]: NodeAnimation;
  };
}

interface NodeAnimation {
  position?: Keyframe<Vec3>[];
  orientation?: Keyframe<Quaternion>[];  // XYZW format
  shapeStretch?: Keyframe<Vec3>[];
  shapeVisible?: Keyframe<boolean>[];
  shapeUvOffset?: Keyframe<Vec2>[];
}

interface Keyframe<T> {
  time: number;
  delta: T;
  interpolationType: "smooth" | "linear" | "step";
}
```

---

## Example Model Analysis: Repeating Crossbow

**File**: `Repeating.blockymodel` (663 lines, 27 nodes)

### Structure Overview

```
R-Attachment (root, isPiece=true, type=none)
└── Origin_Projectile (attachment, type=none)
    └── Origin_Item (type=none)
        └── Stock_Main (type=box, 6x4x60)
            ├── Stock_Cheek_Rest (box, 5x3x16)
            ├── Stock_Grip (box, 5x12x8, rotated)
            ├── Trigger_Housing (box, 4x3x10)
            ├── Trigger_Guard (box, 3x2x8)
            ├── Bolt_Channel (box, 3x2x30)
            ├── Bolt_Channel_Walls_L/R (boxes)
            ├── Magazine_Box (box, 5x14x22)
            ├── Magazine_Lid (box, 6x2x24)
            ├── Magazine_Knob (box, 2x2x4)
            ├── Lever_Pivot (box, rotated)
            ├── Lever_Handle (box, 3x4x5)
            ├── Prod_Center (box, 50x5x5)
            ├── Prod_Left/Right (boxes, rotated)
            ├── Prod_Tip_Left/Right (boxes)
            ├── String_Left/Right (boxes, rotated)
            ├── Foregrip (box, 4x4x8)
            ├── Prod_Binding_Left/Right (boxes)
            └── Iron_Reinforcement (box, 8x2x6)
```

### Key Observations

1. **Hierarchy Depth**: 4 levels (root → projectile origin → item origin → parts)
2. **Attachment Points**: `isPiece: true` nodes have `type: "none"` (invisible)
3. **Rotations**: Several parts use quaternion rotations (grip, lever, prod arms, strings)
4. **UV Complexity**: Each face has independent offset, mirror, and angle settings
5. **Shading**: All parts use `flat` shading mode
6. **Part Reuse**: Left/Right variants share texture coordinates

---

## Core Components

### 1. BlockyModelLoader

Extends Three.js Loader pattern to parse `.blockymodel` JSON.

```typescript
class BlockyModelLoader extends THREE.Loader {
  load(url: string): Promise<BlockyModelGroup>;
  parse(json: BlockyModel): BlockyModelGroup;
}
```

**Responsibilities**:
- Fetch and parse JSON
- Build Three.js Object3D hierarchy
- Create BoxGeometry for each `type: "box"` shape
- Apply position, orientation (quaternion), and stretch transforms
- Return traversable scene graph

### 2. TextureMapper

Handles per-face UV mapping with offset, mirror, and rotation.

```typescript
class TextureMapper {
  applyLayout(
    geometry: THREE.BoxGeometry,
    layout: TextureLayout,
    textureSize: { width: number; height: number }
  ): void;
}
```

**Responsibilities**:
- Convert pixel offsets to UV coordinates (0-1 range)
- Apply mirror transforms per-face
- Rotate UVs by 90/180/270 degrees
- Handle custom unwrap mode

### 3. AnimationController

Wraps Three.js AnimationMixer for `.blockyanim` playback.

```typescript
class AnimationController {
  loadAnimation(url: string): Promise<THREE.AnimationClip>;
  play(clipName?: string): void;
  pause(): void;
  setTime(tick: number): void;
}
```

**Responsibilities**:
- Parse blockyanim JSON
- Convert keyframes to Three.js tracks (VectorKeyframeTrack, QuaternionKeyframeTrack)
- Handle interpolation types (smooth → CatmullRom, linear, step)
- Manage playback at 60 ticks/second

### 4. ViewerController

Orchestrates 3D scene, camera, and user interaction.

```typescript
class ViewerController {
  loadModel(url: string): Promise<void>;
  loadTexture(url: string): Promise<void>;
  loadAnimation(url: string): Promise<void>;

  // Camera controls
  resetCamera(): void;
  setBackgroundColor(color: string): void;
}
```

---

## User Interface

### Minimal Viewer Controls

```
┌─────────────────────────────────────────────────────────┐
│  [📁 Load Model] [🖼️ Load Texture] [🎬 Load Animation]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│                    3D VIEWPORT                          │
│               (orbit, zoom, pan)                        │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ▶️ ⏸️ ⏹️  ━━━━━━━●━━━━━━━━━━━━  0:30 / 1:00           │
│  Animation: idle_loop.blockyanim                        │
└─────────────────────────────────────────────────────────┘
```

### Interaction

| Input | Action |
|-------|--------|
| Left-drag | Orbit camera |
| Right-drag | Pan camera |
| Scroll | Zoom |
| Double-click | Reset view |

---

## File Structure

```
blockymodel-web/
├── src/
│   ├── loaders/
│   │   ├── BlockyModelLoader.ts
│   │   └── BlockyAnimationLoader.ts
│   ├── renderers/
│   │   ├── BoxRenderer.ts
│   │   └── TextureMapper.ts
│   ├── animation/
│   │   └── AnimationController.ts
│   ├── ui/
│   │   ├── ViewerController.ts
│   │   └── Controls.ts
│   ├── types/
│   │   ├── blockymodel.d.ts
│   │   └── blockyanim.d.ts
│   └── main.ts
├── public/
│   └── index.html
├── tests/
│   ├── loaders/
│   └── renderers/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── PRD.md
```

---

## Implementation Phases

### Phase 1: Core Rendering (MVP)
- [ ] BlockyModelLoader: Parse JSON, build hierarchy
- [ ] BoxRenderer: Generate BoxGeometry with correct transforms
- [ ] Basic texture loading (single texture, no UV mapping)
- [ ] OrbitControls for camera interaction
- [ ] File input for local .blockymodel files

### Phase 2: Texture Mapping
- [ ] TextureMapper: Per-face UV offset/mirror/rotation
- [ ] Support for texture atlas sheets
- [ ] Handle missing texture gracefully (fallback color)

### Phase 3: Animation
- [ ] BlockyAnimationLoader: Parse .blockyanim
- [ ] Convert to Three.js AnimationClip
- [ ] Playback controls (play/pause/seek)
- [ ] Handle all interpolation types

### Phase 4: Polish
- [ ] URL-based model loading (share links)
- [ ] Node inspector (click to see properties)
- [ ] Multiple shading modes (flat, fullbright)
- [ ] Performance optimization (InstancedMesh for repeated geometry)

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Initial load (model + texture) | <500ms |
| Frame time | <16ms (60fps) |
| Bundle size | <500KB gzipped |
| Memory (typical model) | <50MB |

---

## Testing Strategy

### Unit Tests
- Loader parsing edge cases (empty nodes, missing fields)
- UV coordinate calculations
- Quaternion to Euler conversions
- Animation interpolation accuracy

### Visual Regression Tests
- Reference renders of known models
- Texture alignment verification
- Animation frame comparison

### Integration Tests
- End-to-end file load → render
- Animation playback timing

---

## Dependencies

```json
{
  "dependencies": {
    "three": "^0.170.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "@types/three": "^0.170.0",
    "vitest": "^1.0.0"
  }
}
```

---

## Open Questions

1. **Quad Support**: Should quads be implemented as PlaneGeometry or simplified BoxGeometry with near-zero depth?
2. **Shading Modes**: How to implement `reflective` mode - environment mapping or simulated highlights?
3. **Multiple Textures**: Can a single model reference multiple texture files?
4. **Coordinate System**: Is Hytale Y-up or Z-up? (Example suggests Z-forward based on crossbow orientation)

---

## References

- [Hytale Blockbench Plugin](https://github.com/JannisX11/hytale-blockbench-plugin) - Official format reference
- [Three.js FileLoader](https://threejs.org/docs/api/en/loaders/FileLoader.html) - Loader base class
- [Three.js AnimationMixer](https://threejs.org/docs/api/en/animation/AnimationMixer.html) - Animation system
- [MagicaVoxel Three.js Integration](https://luciopaiva.com/magicavoxel-threejs-howto/) - Voxel rendering patterns

---

## Appendix: Example Texture Layout

From `Stock_Main` in Repeating.blockymodel:

```json
{
  "front":  { "offset": { "x": 0, "y": 0 },  "mirror": { "x": false, "y": false }, "angle": 0 },
  "back":   { "offset": { "x": 0, "y": 4 },  "mirror": { "x": false, "y": false }, "angle": 0 },
  "left":   { "offset": { "x": 6, "y": 0 },  "mirror": { "x": false, "y": false }, "angle": 0 },
  "right":  { "offset": { "x": 66, "y": 0 }, "mirror": { "x": false, "y": false }, "angle": 0 },
  "top":    { "offset": { "x": 0, "y": 8 },  "mirror": { "x": false, "y": false }, "angle": 0 },
  "bottom": { "offset": { "x": 0, "y": 14 }, "mirror": { "x": false, "y": false }, "angle": 0 }
}
```

For a box with `size: { x: 6, y: 4, z: 60 }`:
- Front/back faces: 6×4 pixels each
- Left/right faces: 60×4 pixels each
- Top/bottom faces: 6×60 pixels each
