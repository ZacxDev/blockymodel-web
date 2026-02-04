// Editor core
export { Editor } from "./editor/Editor";
export { History } from "./editor/History";
export { SelectionManager } from "./editor/SelectionManager";
export { TransformManager } from "./editor/TransformManager";
export { Serializer } from "./editor/Serializer";

// Commands
export { BaseCommand } from "./editor/commands/Command";
export type { Command } from "./editor/commands/Command";
export { SetPositionCommand } from "./editor/commands/SetPositionCommand";
export { SetRotationCommand } from "./editor/commands/SetRotationCommand";
export { SetScaleCommand } from "./editor/commands/SetScaleCommand";
export { SetPropertyCommand } from "./editor/commands/SetPropertyCommand";
export { AddNodeCommand } from "./editor/commands/AddNodeCommand";
export { RemoveNodeCommand } from "./editor/commands/RemoveNodeCommand";

// UI Components
export { PropertyPanel } from "./ui/PropertyPanel";
export { HierarchyPanel } from "./ui/HierarchyPanel";
export { UVEditor } from "./ui/UVEditor";

// Loader
export {
  BlockyModelLoader,
  applyTextureToModel,
  applyTextureLayoutToGeometry,
} from "./loaders/BlockyModelLoader";

// Viewer
export { ViewerController } from "./viewer/ViewerController";

// Types
export type {
  BlockyModel,
  BlockyNode,
  BlockyShape,
  ShapeSettings,
  TextureLayout,
  FaceUV,
  Vec3,
  Vec2,
  Quaternion,
  ShapeType,
  ShadingMode,
  NormalDirection,
} from "./types/blockymodel";

export {
  DEFAULT_POSITION,
  DEFAULT_ORIENTATION,
  DEFAULT_STRETCH,
} from "./types/blockymodel";
