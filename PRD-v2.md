# PRD: BlockyModel Editor v0.2.0

## Overview

Extend the BlockyModel web editor with improved file handling, export options, texture fixes, and a texture editor canvas.

**Version**: 0.2.0
**Status**: Draft
**Author**: Claude
**Date**: 2026-02-03

---

## Problem Statement

### Current Issues

1. **Model Loading Bug**: After loading an initial model, attempting to load a second model fails silently or produces unexpected behavior. No confirmation dialog warns users about losing unsaved changes.

2. **Limited Export Options**: The "Save" button only exports the model file. Users cannot export the texture separately, requiring external tools to extract textures.

3. **Texture Application Issues**: Textures are not being applied correctly to models. Potential causes include:
   - UV coordinates not matching texture layout
   - Material settings not properly configured
   - Texture loading not completing before application

4. **No Texture Editor**: Users must edit textures in external programs (Photoshop, GIMP, etc.) and re-import. There's no way to make quick texture adjustments directly in the editor.

---

## Goals

1. **Reliable Model Loading**: Enable loading new models at any time with proper cleanup and user confirmation
2. **Flexible Export**: Provide granular export options for models and textures
3. **Correct Texture Display**: Ensure textures render correctly on all model faces
4. **In-Editor Texture Editing**: Enable basic texture painting/editing without leaving the application

---

## Requirements

### 1. Model Loading Fix

#### 1.1 Confirmation Dialog

**Priority**: P0 (Critical)

When loading a new model while one is already loaded:

- Display a confirmation dialog: "Load new model? Current changes will be lost."
- Options: "Load" (confirm), "Cancel"
- If confirmed, proceed with cleanup and load
- If cancelled, abort load operation

**Acceptance Criteria**:
- [ ] Dialog appears when model already loaded
- [ ] Dialog does NOT appear on first load (no model present)
- [ ] "Cancel" preserves current state completely
- [ ] "Load" proceeds to cleanup and new load

#### 1.2 State Cleanup

**Priority**: P0 (Critical)

On confirmed new model load:

1. Clear current model from scene (`editor.clearModel()`)
2. Dispose of existing model geometries and materials
3. Clear loaded texture reference
4. Reset selection state
5. Clear undo/redo history
6. Reset UI panels to empty state

**Acceptance Criteria**:
- [ ] No Three.js memory leaks (geometries/materials disposed)
- [ ] Selection cleared before model removed
- [ ] History cleared to prevent invalid undo operations
- [ ] Hierarchy panel shows empty state
- [ ] Property panel shows "No selection"
- [ ] UV editor disabled

#### 1.3 Implementation Location

```
src/main.ts          - Add confirmation dialog logic to loadModel()
src/editor/Editor.ts - Add clearModel() method
src/ui/*             - Add reset/clear methods to panels
```

---

### 2. Export Menu

#### 2.1 Replace Save Button

**Priority**: P1 (High)

Replace the current "Save" button with "Export..." dropdown:

```html
<div class="dropdown">
  <button class="toolbar-btn">📤 Export...</button>
  <div class="dropdown-content">
    <button id="export-model">Model (.blockymodel)</button>
    <button id="export-texture">Texture (.png)</button>
    <button id="export-both">Model + Texture (.zip)</button>
  </div>
</div>
```

**Acceptance Criteria**:
- [ ] Dropdown opens on click
- [ ] Dropdown closes on outside click or selection
- [ ] Ctrl+S triggers "Export Model" (maintains existing shortcut)
- [ ] Each export option works independently

#### 2.2 Export Model

**Priority**: P1 (High)

Existing functionality, relocated:
- Serialize current model to BlockyModel JSON format
- Download as `.blockymodel` file
- Filename: `{original-name}.blockymodel` or `model.blockymodel`

#### 2.3 Export Texture

**Priority**: P1 (High)

New functionality:
- Export current texture as PNG file
- If texture was modified in editor, export the modified version
- If no texture loaded, show error: "No texture to export"
- Filename: `{original-name}.png` or `texture.png`

**Implementation**:
```typescript
function exportTexture(texture: THREE.Texture): void {
  const canvas = document.createElement('canvas');
  // Draw texture to canvas
  // canvas.toBlob() -> download
}
```

#### 2.4 Export Both (ZIP)

**Priority**: P2 (Medium)

Package model and texture together:
- Create ZIP archive containing:
  - `model.blockymodel`
  - `texture.png`
- Requires: JSZip or similar library
- Filename: `{model-name}.zip`

---

### 3. Texture Application Fix

#### 3.1 Diagnose Current Issues

**Priority**: P0 (Critical)

Investigate and fix texture rendering:

1. **UV Coordinate Verification**
   - Ensure UV coordinates match BlockyModel texture layout format
   - Verify per-face UV offsets are applied correctly
   - Check that rotation and mirror transforms work

2. **Material Configuration**
   - Verify `magFilter` and `minFilter` set to `NearestFilter`
   - Ensure `colorSpace` is `SRGBColorSpace`
   - Check material `needsUpdate` flag is set

3. **Timing Issues**
   - Ensure texture is fully loaded before applying to materials
   - Handle async texture loading properly

4. **Face Index Mapping**
   - Verify BoxGeometry face indices match expected UV face mapping
   - Current mapping (lines 257-262 of UVEditor.ts):
     ```
     right: 0, left: 1, top: 2, bottom: 3, front: 4, back: 5
     ```

**Acceptance Criteria**:
- [ ] Texture displays correctly on all 6 faces of a box
- [ ] UV offset adjustments reflect immediately
- [ ] Mirror and rotation work correctly
- [ ] Quad shapes display textures correctly

#### 3.2 Default Texture Layout

**Priority**: P1 (High)

When no texture layout data exists in the model:
- Apply sensible default UV coordinates
- Use full texture (0,0 to 1,1) for each face
- Allow UV editor to override

---

### 4. Texture Editor

#### 4.1 Texture Canvas Panel

**Priority**: P1 (High)

Add a new panel for texture editing:

```
┌─────────────────────────────────────┐
│ Texture Editor                   [▼]│
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │     [Texture Canvas]            │ │
│ │     256x256 or actual size      │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Tools: [✏️] [🪣] [🔲] [↩️]           │
│ Color: [████] #FFFFFF               │
│ Size:  [1px ▼]                      │
└─────────────────────────────────────┘
```

**Features**:
- Canvas displays current texture at editable resolution
- Pixel grid overlay for precise editing
- Zoom controls (fit, 1x, 2x, 4x)
- Pan with middle mouse or spacebar+drag

**Acceptance Criteria**:
- [ ] Texture displays in panel when loaded
- [ ] Canvas supports zoom and pan
- [ ] Empty state shows "No texture loaded" message
- [ ] Changes sync to 3D viewport in real-time

#### 4.2 Basic Drawing Tools

**Priority**: P1 (High)

**Pencil Tool** (✏️):
- Single pixel drawing
- Click and drag to draw
- Configurable brush size (1px, 2px, 4px)

**Fill Tool** (🪣):
- Flood fill connected pixels of same color
- Respects transparency

**Color Picker**:
- Click to select color from palette
- Eyedropper from canvas (Alt+click)
- Recent colors history (8 colors)
- Input field for hex values

**Eraser** (🔲):
- Sets pixels to transparent
- Same size options as pencil

**Undo/Redo** (↩️):
- Texture changes use separate history from model edits
- Ctrl+Z / Ctrl+Shift+Z when canvas focused

**Acceptance Criteria**:
- [ ] Pencil draws pixels accurately
- [ ] Fill tool works with tolerance
- [ ] Color picker syncs with draw color
- [ ] Eraser creates transparency
- [ ] Undo/redo tracks texture changes

#### 4.3 UV Overlay

**Priority**: P2 (Medium)

Show UV regions on texture canvas:
- Outline boxes showing where each face maps
- Highlight current face when selected in UV Editor
- Toggle overlay visibility
- Color-coded by face (front=red, back=blue, etc.)

#### 4.4 Real-Time Preview

**Priority**: P1 (High)

Changes in texture editor reflect immediately in 3D viewport:
- Debounce updates (16ms / 60fps max)
- Update texture without recreating materials
- Use `texture.needsUpdate = true`

---

## Technical Design

### New Files

```
src/ui/TextureEditor.ts      - Texture canvas and drawing tools
src/ui/ExportMenu.ts         - Export dropdown component
src/ui/ConfirmDialog.ts      - Reusable confirmation dialog
src/editor/TextureHistory.ts - Undo/redo for texture edits
```

### Modified Files

```
src/main.ts                  - Add confirmation dialog to loadModel()
src/editor/Editor.ts         - Add clearModel(), texture state
src/ui/HierarchyPanel.ts     - Add reset() method
src/ui/PropertyPanel.ts      - Add reset() method
src/ui/UVEditor.ts           - Add reset() method
src/loaders/BlockyModelLoader.ts - Fix texture application
index.html                   - Add export dropdown, texture editor panel
src/styles.css               - New component styles
```

### Dependencies

```json
{
  "dependencies": {
    "jszip": "^3.10.1"  // For export-both ZIP feature
  }
}
```

---

## UI/UX Specifications

### Confirmation Dialog

```
┌────────────────────────────────────┐
│  ⚠️ Load New Model?                │
├────────────────────────────────────┤
│                                    │
│  Current changes will be lost.     │
│                                    │
│           [Cancel]  [Load]         │
└────────────────────────────────────┘
```

- Modal overlay (semi-transparent background)
- Escape key = Cancel
- Enter key = Load (primary action)
- Click outside = Cancel

### Export Dropdown

```
┌──────────────────────────┐
│ 📤 Export...          ▼  │
└──────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 📄 Model (.blockymodel)  │
│ 🖼️ Texture (.png)        │
│ 📦 Model + Texture (.zip)│
└──────────────────────────┘
```

- Hover highlight on menu items
- Disabled state with tooltip if no model/texture

### Texture Editor Panel

- Collapsible like other panels
- Default collapsed on small screens
- Minimum width: 200px
- Canvas aspect ratio matches texture

---

## Success Metrics

1. **Model Loading**: 100% success rate loading second model after first
2. **Export**: All three export options functional with correct file formats
3. **Texture Display**: Visual verification that textures render correctly
4. **Texture Editor**: Users can make and save texture modifications

---

## Implementation Phases

### Phase 1: Critical Fixes (P0)
- [ ] Model loading confirmation dialog
- [ ] State cleanup on new model load
- [ ] Texture application fix

### Phase 2: Export Menu (P1)
- [ ] Export dropdown UI
- [ ] Export model (move existing)
- [ ] Export texture (new)

### Phase 3: Texture Editor (P1)
- [ ] Texture canvas panel
- [ ] Basic drawing tools (pencil, fill, eraser)
- [ ] Color picker
- [ ] Real-time 3D preview

### Phase 4: Enhancements (P2)
- [ ] Export both (ZIP)
- [ ] UV overlay on texture canvas
- [ ] Advanced drawing tools

---

## Open Questions

1. **Texture Resolution**: Should we support texture resizing in the editor?
2. **Import Texture Only**: Should users be able to load a texture without a model?
3. **Multiple Textures**: BlockyModel supports multiple texture references - handle in v0.2 or defer?
4. **Layer Support**: Should texture editor support layers for non-destructive editing?

---

## Appendix: BlockyModel Texture Layout Format

From `src/types/blockymodel.ts`:

```typescript
interface TextureLayout {
  front?: FaceUV;
  back?: FaceUV;
  left?: FaceUV;
  right?: FaceUV;
  top?: FaceUV;
  bottom?: FaceUV;
}

interface FaceUV {
  offset: Vec2;      // Pixel offset in texture
  mirrorX?: boolean;
  mirrorY?: boolean;
  rotation?: number; // 0, 90, 180, 270
}
```
