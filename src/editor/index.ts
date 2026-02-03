// Editor core
export { Editor } from "./Editor";
export type { EditorEvent, EditorOptions } from "./Editor";

// Subsystems
export { SelectionManager } from "./SelectionManager";
export { TransformManager } from "./TransformManager";
export { History } from "./History";
export { Serializer } from "./Serializer";

// Commands
export type { Command } from "./commands/Command";
export { BaseCommand } from "./commands/Command";
export { SetPositionCommand } from "./commands/SetPositionCommand";
export { SetRotationCommand } from "./commands/SetRotationCommand";
export { SetScaleCommand } from "./commands/SetScaleCommand";
export { SetPropertyCommand } from "./commands/SetPropertyCommand";
export { AddNodeCommand } from "./commands/AddNodeCommand";
export { RemoveNodeCommand } from "./commands/RemoveNodeCommand";
