import * as THREE from "three";
import type {
  BlockyModel,
  BlockyNode,
  BlockyShape,
  Vec3,
} from "../types/blockymodel";
import {
  DEFAULT_POSITION,
  DEFAULT_ORIENTATION,
  DEFAULT_STRETCH,
} from "../types/blockymodel";

/**
 * Loader for .blockymodel files
 * Parses JSON and builds Three.js Object3D hierarchy
 */
export class BlockyModelLoader extends THREE.Loader {
  constructor(manager?: THREE.LoadingManager) {
    super(manager);
  }

  /**
   * Load a .blockymodel file from URL
   */
  async load(url: string): Promise<THREE.Group> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.statusText}`);
    }
    const json = await response.json();
    return this.parse(json);
  }

  /**
   * Load from File object (for drag-drop / file input)
   */
  async loadFromFile(file: File): Promise<THREE.Group> {
    const text = await file.text();
    const json = JSON.parse(text);
    return this.parse(json);
  }

  /**
   * Parse BlockyModel JSON into Three.js scene graph
   */
  parse(json: BlockyModel): THREE.Group {
    const root = new THREE.Group();
    root.name = "BlockyModel";
    root.userData.format = json.format;
    root.userData.lod = json.lod;

    for (const node of json.nodes) {
      const object = this.parseNode(node);
      root.add(object);
    }

    return root;
  }

  /**
   * Recursively parse a BlockyNode into Three.js Object3D
   */
  private parseNode(node: BlockyNode): THREE.Object3D {
    const object = this.createNodeObject(node);

    // Set name and metadata
    object.name = node.name;
    object.userData.id = node.id;
    object.userData.isPiece = node.shape?.settings?.isPiece ?? false;

    // Apply position
    const pos = node.position ?? DEFAULT_POSITION;
    object.position.set(pos.x, pos.y, pos.z);

    // Apply orientation (quaternion)
    const orient = node.orientation ?? DEFAULT_ORIENTATION;
    object.quaternion.set(orient.x, orient.y, orient.z, orient.w);

    // Recursively add children
    for (const child of node.children ?? []) {
      const childObject = this.parseNode(child);
      object.add(childObject);
    }

    return object;
  }

  /**
   * Create the appropriate Object3D based on shape type
   */
  private createNodeObject(node: BlockyNode): THREE.Object3D {
    const shape = node.shape;

    // No shape or invisible - return empty group
    if (!shape || shape.type === "none" || !shape.visible) {
      const group = new THREE.Group();
      group.userData.shapeType = shape?.type ?? "none";
      return group;
    }

    if (shape.type === "box") {
      return this.createBox(shape);
    }

    if (shape.type === "quad") {
      return this.createQuad(shape);
    }

    // Fallback to empty group for unknown types
    return new THREE.Group();
  }

  /**
   * Create a box mesh from shape data
   */
  private createBox(shape: BlockyShape): THREE.Mesh {
    const size = shape.settings.size ?? { x: 1, y: 1, z: 1 };
    const stretch = shape.stretch ?? DEFAULT_STRETCH;
    const offset = shape.offset ?? DEFAULT_POSITION;

    // Apply stretch to size
    const finalSize: Vec3 = {
      x: size.x * stretch.x,
      y: size.y * stretch.y,
      z: size.z * stretch.z,
    };

    // Create geometry
    const geometry = new THREE.BoxGeometry(finalSize.x, finalSize.y, finalSize.z);

    // Apply offset by translating geometry vertices
    geometry.translate(offset.x, offset.y, offset.z);

    // Create material based on shading mode
    const material = this.createMaterial(shape);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.shapeType = "box";
    mesh.userData.originalSize = size;
    mesh.userData.shadingMode = shape.shadingMode;
    mesh.userData.textureLayout = shape.textureLayout;

    // Handle double-sided
    if (shape.doubleSided) {
      material.side = THREE.DoubleSide;
    }

    return mesh;
  }

  /**
   * Create a quad (plane) mesh from shape data
   */
  private createQuad(shape: BlockyShape): THREE.Mesh {
    const size = shape.settings.size ?? { x: 1, y: 1, z: 0 };
    const stretch = shape.stretch ?? DEFAULT_STRETCH;
    const offset = shape.offset ?? DEFAULT_POSITION;
    const normal = shape.settings.normal ?? "+Z";

    // Determine plane dimensions based on normal direction
    let width: number, height: number;
    switch (normal) {
      case "+X":
      case "-X":
        width = size.z * stretch.z;
        height = size.y * stretch.y;
        break;
      case "+Y":
      case "-Y":
        width = size.x * stretch.x;
        height = size.z * stretch.z;
        break;
      case "+Z":
      case "-Z":
      default:
        width = size.x * stretch.x;
        height = size.y * stretch.y;
        break;
    }

    const geometry = new THREE.PlaneGeometry(width, height);

    // Rotate plane based on normal direction
    switch (normal) {
      case "+X":
        geometry.rotateY(Math.PI / 2);
        break;
      case "-X":
        geometry.rotateY(-Math.PI / 2);
        break;
      case "+Y":
        geometry.rotateX(-Math.PI / 2);
        break;
      case "-Y":
        geometry.rotateX(Math.PI / 2);
        break;
      case "-Z":
        geometry.rotateY(Math.PI);
        break;
      // +Z is default orientation
    }

    geometry.translate(offset.x, offset.y, offset.z);

    const material = this.createMaterial(shape);
    material.side = shape.doubleSided ? THREE.DoubleSide : THREE.FrontSide;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.shapeType = "quad";
    mesh.userData.shadingMode = shape.shadingMode;

    return mesh;
  }

  /**
   * Create material based on shading mode
   * Phase 1: Basic color material, texture mapping in Phase 2
   */
  private createMaterial(shape: BlockyShape): THREE.MeshStandardMaterial {
    const baseColor = 0x888888; // Gray placeholder until texture is applied

    switch (shape.shadingMode) {
      case "fullbright":
        return new THREE.MeshStandardMaterial({
          color: baseColor,
          emissive: baseColor,
          emissiveIntensity: 1,
          roughness: 1,
          metalness: 0,
        });

      case "flat":
        return new THREE.MeshStandardMaterial({
          color: baseColor,
          flatShading: true,
          roughness: 0.9,
          metalness: 0,
        });

      case "reflective":
        return new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.1,
          metalness: 0.8,
        });

      case "standard":
      default:
        return new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.7,
          metalness: 0,
        });
    }
  }
}

/**
 * Helper to apply a texture to all meshes in a loaded model
 * Phase 1: Simple texture application without UV mapping
 */
export function applyTextureToModel(
  model: THREE.Group,
  texture: THREE.Texture
): void {
  // Configure texture for pixel art (no filtering)
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  // Get texture dimensions (from image if available)
  const textureWidth = texture.image?.width || 64;
  const textureHeight = texture.image?.height || 64;

  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      const material = object.material as THREE.MeshStandardMaterial;
      if (material.isMeshStandardMaterial) {
        material.map = texture;
        material.color.setHex(0xffffff); // Reset color to white when texture applied
        material.needsUpdate = true;
      }

      // Apply texture layout if available for box shapes
      if (object.userData.shapeType === "box" && object.userData.textureLayout) {
        applyTextureLayoutToGeometry(
          object.geometry as THREE.BufferGeometry,
          object.userData.textureLayout,
          textureWidth,
          textureHeight
        );
      }
    }
  });
}


// Face names for BoxGeometry in Three.js order
type FaceName = "front" | "back" | "left" | "right" | "top" | "bottom";
const FACE_NAMES: FaceName[] = ["right", "left", "top", "bottom", "front", "back"];

interface FaceUV {
  offset?: { x: number; y: number };
  mirror?: { x: boolean; y: boolean };
  angle?: 0 | 90 | 180 | 270;
}

interface TextureLayout {
  front?: FaceUV;
  back?: FaceUV;
  left?: FaceUV;
  right?: FaceUV;
  top?: FaceUV;
  bottom?: FaceUV;
}

/**
 * Apply texture layout to a BoxGeometry's UV coordinates
 * @param geometry The box geometry to modify
 * @param layout The texture layout with per-face UV settings
 * @param textureWidth Texture width in pixels
 * @param textureHeight Texture height in pixels
 */
export function applyTextureLayoutToGeometry(
  geometry: THREE.BufferGeometry,
  layout: TextureLayout,
  textureWidth: number,
  textureHeight: number
): void {
  const uvAttribute = geometry.getAttribute("uv");
  if (!uvAttribute) return;

  // BoxGeometry face order in Three.js: +x, -x, +y, -y, +z, -z
  // Which maps to: right, left, top, bottom, front, back
  const faceIndexMap: Record<FaceName, number> = {
    right: 0,
    left: 1,
    top: 2,
    bottom: 3,
    front: 4,
    back: 5,
  };

  // Store original UVs to reset before applying transforms
  const originalUVs = new Float32Array(uvAttribute.array.length);
  for (let i = 0; i < uvAttribute.array.length; i++) {
    originalUVs[i] = uvAttribute.array[i];
  }

  const uvs = uvAttribute.array as Float32Array;

  for (const face of FACE_NAMES) {
    const faceUV = layout[face];
    if (!faceUV) continue;

    const faceIndex = faceIndexMap[face];
    const startVertex = faceIndex * 6; // 6 vertices per face (2 triangles)

    // Calculate normalized offset
    const offsetX = (faceUV.offset?.x || 0) / textureWidth;
    const offsetY = (faceUV.offset?.y || 0) / textureHeight;

    // Apply transforms to each vertex's UV
    for (let i = 0; i < 6; i++) {
      const idx = (startVertex + i) * 2;
      
      // Start with original UVs
      let u = originalUVs[idx];
      let v = originalUVs[idx + 1];

      // Mirror
      if (faceUV.mirror?.x) u = 1 - u;
      if (faceUV.mirror?.y) v = 1 - v;

      // Rotation around center (0.5, 0.5)
      if (faceUV.angle) {
        const rad = (faceUV.angle * Math.PI) / 180;
        const cu = u - 0.5;
        const cv = v - 0.5;
        u = cu * Math.cos(rad) - cv * Math.sin(rad) + 0.5;
        v = cu * Math.sin(rad) + cv * Math.cos(rad) + 0.5;
      }

      // Apply offset
      uvs[idx] = u + offsetX;
      uvs[idx + 1] = v + offsetY;
    }
  }

  uvAttribute.needsUpdate = true;
}
