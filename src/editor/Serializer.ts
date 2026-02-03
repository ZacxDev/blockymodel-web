import * as THREE from "three";
import type {
  BlockyModel,
  BlockyNode,
  BlockyShape,
  Vec3,
  Quaternion,
  TextureLayout,
  ShadingMode,
  ShapeType,
} from "../types/blockymodel";

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `node_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Serializer for exporting Three.js scene to BlockyModel format
 */
export class Serializer {
  /**
   * Serialize a Three.js model group to BlockyModel JSON
   */
  serialize(model: THREE.Group): BlockyModel {
    const blockyModel: BlockyModel = {
      format: model.userData.format || "prop",
      lod: model.userData.lod || "auto",
      nodes: [],
    };

    // Serialize root-level children (skip helpers)
    for (const child of model.children) {
      if (this.shouldSerialize(child)) {
        blockyModel.nodes.push(this.serializeNode(child));
      }
    }

    return blockyModel;
  }

  /**
   * Check if an object should be serialized
   */
  private shouldSerialize(object: THREE.Object3D): boolean {
    // Skip transform controls and other helpers
    if (
      object.type === "TransformControlsGizmo" ||
      object.type === "TransformControlsPlane" ||
      object.type === "GridHelper" ||
      object.type === "AxesHelper"
    ) {
      return false;
    }
    return true;
  }

  /**
   * Serialize a single node
   */
  private serializeNode(object: THREE.Object3D): BlockyNode {
    const node: BlockyNode = {
      id: object.userData.id || object.name || generateId(),
      name: object.name || "Unnamed",
      position: this.serializePosition(object.position),
      orientation: this.serializeQuaternion(object.quaternion),
      shape: this.serializeShape(object),
      children: [],
    };

    // Serialize children
    for (const child of object.children) {
      if (this.shouldSerialize(child)) {
        node.children.push(this.serializeNode(child));
      }
    }

    return node;
  }

  /**
   * Serialize position
   */
  private serializePosition(position: THREE.Vector3): Vec3 {
    return {
      x: parseFloat(position.x.toFixed(4)),
      y: parseFloat(position.y.toFixed(4)),
      z: parseFloat(position.z.toFixed(4)),
    };
  }

  /**
   * Serialize quaternion
   */
  private serializeQuaternion(quaternion: THREE.Quaternion): Quaternion {
    return {
      w: parseFloat(quaternion.w.toFixed(6)),
      x: parseFloat(quaternion.x.toFixed(6)),
      y: parseFloat(quaternion.y.toFixed(6)),
      z: parseFloat(quaternion.z.toFixed(6)),
    };
  }

  /**
   * Serialize shape
   */
  private serializeShape(object: THREE.Object3D): BlockyShape {
    const shapeType = (object.userData.shapeType || "none") as ShapeType;

    // Base shape with defaults
    const shape: BlockyShape = {
      type: shapeType,
      offset: object.userData.offset || { x: 0, y: 0, z: 0 },
      stretch: object.userData.stretch || { x: 1, y: 1, z: 1 },
      settings: {
        size: object.userData.originalSize || { x: 1, y: 1, z: 1 },
        isPiece: object.userData.isPiece || false,
        isStaticBox: object.userData.isStaticBox || false,
      },
      textureLayout: object.userData.textureLayout || this.getDefaultTextureLayout(),
      unwrapMode: object.userData.unwrapMode || "custom",
      visible: object.visible !== false,
      doubleSided: object.userData.doubleSided || false,
      shadingMode: (object.userData.shadingMode || "standard") as ShadingMode,
    };

    // For mesh objects, try to extract geometry info
    if (object instanceof THREE.Mesh) {
      const geometry = object.geometry;

      // Extract size from BoxGeometry if available
      if (geometry instanceof THREE.BoxGeometry) {
        const params = geometry.parameters;
        if (!object.userData.originalSize) {
          shape.settings.size = {
            x: params.width,
            y: params.height,
            z: params.depth,
          };
        }
      }

      // Extract material properties
      const material = object.material as THREE.MeshStandardMaterial;
      if (material) {
        shape.doubleSided = material.side === THREE.DoubleSide;

        // Infer shading mode from material properties
        if (material.emissiveIntensity > 0.5) {
          shape.shadingMode = "fullbright";
        } else if (material.flatShading) {
          shape.shadingMode = "flat";
        } else if (material.metalness > 0.5) {
          shape.shadingMode = "reflective";
        }
      }
    }

    // For quads, include normal direction
    if (shapeType === "quad" && object.userData.normal) {
      shape.settings.normal = object.userData.normal;
    }

    return shape;
  }

  /**
   * Get default texture layout
   */
  private getDefaultTextureLayout(): TextureLayout {
    const defaultFace = {
      offset: { x: 0, y: 0 },
      mirror: { x: false, y: false },
      angle: 0 as const,
    };

    return {
      front: { ...defaultFace },
      back: { ...defaultFace },
      left: { ...defaultFace },
      right: { ...defaultFace },
      top: { ...defaultFace },
      bottom: { ...defaultFace },
    };
  }

  /**
   * Export model to JSON string
   */
  toJSON(model: THREE.Group): string {
    const blockyModel = this.serialize(model);
    return JSON.stringify(blockyModel, null, 2);
  }

  /**
   * Download model as .blockymodel file
   */
  download(model: THREE.Group, filename: string = "model.blockymodel"): void {
    const json = this.toJSON(model);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".blockymodel") ? filename : `${filename}.blockymodel`;
    link.click();

    URL.revokeObjectURL(url);
  }
}
