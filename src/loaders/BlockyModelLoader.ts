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
    mesh.userData.textureLayout = shape.textureLayout;
    mesh.userData.originalSize = size;
    mesh.userData.normal = normal;

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
          transparent: true,
          alphaTest: 0.1,
        });

      case "flat":
        return new THREE.MeshStandardMaterial({
          color: baseColor,
          flatShading: true,
          roughness: 0.9,
          metalness: 0,
          transparent: true,
          alphaTest: 0.1,
        });

      case "reflective":
        return new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.1,
          metalness: 0.8,
          transparent: true,
          alphaTest: 0.1,
        });

      case "standard":
      default:
        return new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.7,
          metalness: 0,
          transparent: true,
          alphaTest: 0.1,
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
        // Enable transparency for PNG alpha support
        material.transparent = true;
        material.alphaTest = 0.1;
        material.needsUpdate = true;
      }

      // Apply texture layout if available for box shapes
      if (object.userData.shapeType === "box" && object.userData.textureLayout) {
        const boxSize = object.userData.originalSize || { x: 1, y: 1, z: 1 };
        applyTextureLayoutToGeometry(
          object.geometry as THREE.BufferGeometry,
          object.userData.textureLayout,
          textureWidth,
          textureHeight,
          boxSize
        );
      }

      // Apply texture layout for quad shapes
      if (object.userData.shapeType === "quad" && object.userData.textureLayout) {
        const size = object.userData.originalSize || { x: 1, y: 1, z: 1 };
        applyTextureLayoutToQuad(
          object.geometry as THREE.BufferGeometry,
          object.userData.textureLayout,
          textureWidth,
          textureHeight,
          size,
          object.userData.normal || "+Z"
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

type NormalDirection = "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z";

/**
 * Map normal direction to the corresponding face name for texture layout
 */
function normalToFaceName(normal: NormalDirection): FaceName {
  switch (normal) {
    case "+X": return "right";
    case "-X": return "left";
    case "+Y": return "top";
    case "-Y": return "bottom";
    case "+Z": return "front";
    case "-Z": return "back";
  }
}

/**
 * Get quad dimensions based on normal direction
 */
function getQuadDimensions(
  size: { x: number; y: number; z: number },
  normal: NormalDirection
): [number, number] {
  switch (normal) {
    case "+X":
    case "-X":
      return [size.z, size.y];
    case "+Y":
    case "-Y":
      return [size.x, size.z];
    case "+Z":
    case "-Z":
    default:
      return [size.x, size.y];
  }
}

/**
 * Apply texture layout to a PlaneGeometry's UV coordinates
 * Quads use the face corresponding to their normal direction
 */
function applyTextureLayoutToQuad(
  geometry: THREE.BufferGeometry,
  layout: TextureLayout,
  textureWidth: number,
  textureHeight: number,
  size: { x: number; y: number; z: number },
  normal: string
): void {
  const uvAttribute = geometry.getAttribute("uv");
  if (!uvAttribute) return;

  const normalDir = normal as NormalDirection;
  const faceName = normalToFaceName(normalDir);
  const faceUV = layout[faceName];

  const uvs = uvAttribute.array as Float32Array;

  if (!faceUV) {
    // No texture layout - sample transparent point at origin
    for (let i = 0; i < uvs.length; i += 2) {
      uvs[i] = 0;
      uvs[i + 1] = 1;
    }
  } else {
    const [faceWidth, faceHeight] = getQuadDimensions(size, normalDir);
    const [u1, v1, u2, v2] = calculateFaceUVs(
      faceUV,
      faceWidth,
      faceHeight,
      textureWidth,
      textureHeight
    );

    // PlaneGeometry has 4 vertices in order:
    // [0]: top-left, [1]: top-right, [2]: bottom-left, [3]: bottom-right
    // (Different from BoxGeometry face vertex order!)
    const vertexUVs = [
      [u1, 1 - v1], // top-left
      [u2, 1 - v1], // top-right
      [u1, 1 - v2], // bottom-left
      [u2, 1 - v2], // bottom-right
    ];

    for (let i = 0; i < 4; i++) {
      uvs[i * 2] = vertexUVs[i][0];
      uvs[i * 2 + 1] = vertexUVs[i][1];
    }
  }

  uvAttribute.needsUpdate = true;
}

/**
 * Calculate face dimensions based on box size
 * Each face's texture region size is determined by the box dimensions
 */
function getFaceDimensions(
  face: FaceName,
  boxSize: { x: number; y: number; z: number }
): [number, number] {
  switch (face) {
    case "front":
    case "back":
      return [boxSize.x, boxSize.y];
    case "left":
    case "right":
      return [boxSize.z, boxSize.y];
    case "top":
    case "bottom":
      return [boxSize.x, boxSize.z];
  }
}

/**
 * Calculate UV rectangle for a face based on Hytale's blockymodel format
 *
 * The offset specifies the TOP-LEFT corner of the texture region in PIXEL coordinates.
 * Mirror flips the sampling direction (swaps start/end).
 * Angle rotates the UV region, swapping dimensions for 90/270.
 *
 * Based on Hytale Blockbench Plugin implementation.
 */
function calculateFaceUVs(
  faceUV: FaceUV,
  faceWidth: number,
  faceHeight: number,
  textureWidth: number,
  textureHeight: number
): [number, number, number, number] {
  const offset = faceUV.offset || { x: 0, y: 0 };
  const mirror = faceUV.mirror || { x: false, y: false };
  const angle = faceUV.angle || 0;

  let uvWidth = faceWidth;
  let uvHeight = faceHeight;
  let mirrorX = mirror.x ? -1 : 1;
  let mirrorY = mirror.y ? -1 : 1;

  let u1: number, v1: number, u2: number, v2: number;

  switch (angle) {
    case 90:
      // Swap dimensions and mirror axes
      [uvWidth, uvHeight] = [uvHeight, uvWidth];
      [mirrorX, mirrorY] = [mirrorY, mirrorX];
      mirrorX *= -1;
      u1 = offset.x;
      v1 = offset.y + uvHeight * mirrorY;
      u2 = offset.x + uvWidth * mirrorX;
      v2 = offset.y;
      break;

    case 180:
      mirrorX *= -1;
      mirrorY *= -1;
      u1 = offset.x + uvWidth * mirrorX;
      v1 = offset.y + uvHeight * mirrorY;
      u2 = offset.x;
      v2 = offset.y;
      break;

    case 270:
      [uvWidth, uvHeight] = [uvHeight, uvWidth];
      [mirrorX, mirrorY] = [mirrorY, mirrorX];
      mirrorY *= -1;
      u1 = offset.x + uvWidth * mirrorX;
      v1 = offset.y;
      u2 = offset.x;
      v2 = offset.y + uvHeight * mirrorY;
      break;

    case 0:
    default:
      u1 = offset.x;
      v1 = offset.y;
      u2 = offset.x + uvWidth * mirrorX;
      v2 = offset.y + uvHeight * mirrorY;
      break;
  }

  // Normalize to 0-1 range
  return [
    u1 / textureWidth,
    v1 / textureHeight,
    u2 / textureWidth,
    v2 / textureHeight,
  ];
}

/**
 * Apply texture layout to a BoxGeometry's UV coordinates
 *
 * Implements Hytale's blockymodel texture mapping:
 * - Offset is the top-left pixel coordinate of the face's texture region
 * - Face dimensions determine the size of the UV region (in pixels)
 * - Mirror swaps start/end coordinates
 * - Angle rotates by swapping dimensions and adjusting coordinates
 *
 * @param geometry The box geometry to modify
 * @param layout The texture layout with per-face UV settings
 * @param textureWidth Texture width in pixels
 * @param textureHeight Texture height in pixels
 * @param boxSize Optional box dimensions for calculating face sizes (defaults to 1,1,1)
 */
export function applyTextureLayoutToGeometry(
  geometry: THREE.BufferGeometry,
  layout: TextureLayout,
  textureWidth: number,
  textureHeight: number,
  boxSize: { x: number; y: number; z: number } = { x: 1, y: 1, z: 1 }
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

  const uvs = uvAttribute.array as Float32Array;
  const verticesPerFace = 4;

  for (const face of FACE_NAMES) {
    const faceUV = layout[face];
    const faceIndex = faceIndexMap[face];
    const startVertex = faceIndex * verticesPerFace;

    let vertexUVs: number[][];

    if (!faceUV) {
      // Faces without textureLayout should sample a single point at origin
      // This typically maps to a transparent pixel, preventing "floating" texture artifacts
      vertexUVs = [
        [0, 1], // All vertices at same point (0,0 in image coords = 0,1 in UV)
        [0, 1],
        [0, 1],
        [0, 1],
      ];
    } else {
      // Get face dimensions from box size
      const [faceWidth, faceHeight] = getFaceDimensions(face, boxSize);

      // Calculate UV rectangle
      const [u1, v1, u2, v2] = calculateFaceUVs(
        faceUV,
        faceWidth,
        faceHeight,
        textureWidth,
        textureHeight
      );

      // BoxGeometry vertex order per face (looking at front face):
      // [0]: bottom-left, [1]: bottom-right, [2]: top-left, [3]: top-right
      //
      // Note: V coordinate is flipped because Hytale uses image coordinates
      // (top-left origin) while Three.js textures use bottom-left origin.
      // We flip V by using (1 - v) to convert between coordinate systems.
      vertexUVs = [
        [u1, 1 - v2], // bottom-left  (v2 is bottom in image coords)
        [u2, 1 - v2], // bottom-right
        [u1, 1 - v1], // top-left     (v1 is top in image coords)
        [u2, 1 - v1], // top-right
      ];
    }

    for (let i = 0; i < 4; i++) {
      const idx = (startVertex + i) * 2;
      uvs[idx] = vertexUVs[i][0];
      uvs[idx + 1] = vertexUVs[i][1];
    }
  }

  uvAttribute.needsUpdate = true;
}
