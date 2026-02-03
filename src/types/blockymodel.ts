/**
 * BlockyModel format type definitions
 * Based on Hytale's native 3D model format
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface FaceUV {
  offset: Vec2;
  mirror: { x: boolean; y: boolean };
  angle: 0 | 90 | 180 | 270;
}

export interface TextureLayout {
  front?: FaceUV;
  back?: FaceUV;
  left?: FaceUV;
  right?: FaceUV;
  top?: FaceUV;
  bottom?: FaceUV;
}

export type ShapeType = "box" | "quad" | "none";

export type ShadingMode = "standard" | "flat" | "fullbright" | "reflective";

export type NormalDirection = "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z";

export interface ShapeSettings {
  size?: Vec3;
  normal?: NormalDirection;
  isPiece?: boolean;
  isStaticBox?: boolean;
}

export interface BlockyShape {
  type: ShapeType;
  offset: Vec3;
  stretch: Vec3;
  settings: ShapeSettings;
  textureLayout: TextureLayout;
  unwrapMode: "custom" | "auto";
  visible: boolean;
  doubleSided: boolean;
  shadingMode: ShadingMode;
}

export interface BlockyNode {
  id: string;
  name: string;
  position?: Vec3;
  orientation?: Quaternion;
  shape: BlockyShape;
  children: BlockyNode[];
}

export interface BlockyModel {
  lod?: "auto" | string;
  format?: "character" | "prop";
  nodes: BlockyNode[];
}

// Default values for optional fields
export const DEFAULT_POSITION: Vec3 = { x: 0, y: 0, z: 0 };
export const DEFAULT_ORIENTATION: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
export const DEFAULT_STRETCH: Vec3 = { x: 1, y: 1, z: 1 };
