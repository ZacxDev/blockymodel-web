import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { SetScaleCommand } from "../../../src/editor/commands/SetScaleCommand";

describe("SetScaleCommand", () => {
  let object: THREE.Object3D;
  let oldScale: THREE.Vector3;
  let newScale: THREE.Vector3;

  beforeEach(() => {
    object = new THREE.Object3D();
    object.scale.set(1, 1, 1);
    oldScale = object.scale.clone();
    newScale = new THREE.Vector3(2, 3, 4);
  });

  it("should execute and set new scale", () => {
    const command = new SetScaleCommand(object, newScale, oldScale);
    command.execute();

    expect(object.scale.x).toBe(2);
    expect(object.scale.y).toBe(3);
    expect(object.scale.z).toBe(4);
  });

  it("should undo and restore old scale", () => {
    const command = new SetScaleCommand(object, newScale, oldScale);
    command.execute();
    command.undo();

    expect(object.scale.x).toBe(1);
    expect(object.scale.y).toBe(1);
    expect(object.scale.z).toBe(1);
  });

  it("should have correct type", () => {
    const command = new SetScaleCommand(object, newScale, oldScale);
    expect(command.type).toBe("SetScale");
  });

  it("should be updatable", () => {
    const command = new SetScaleCommand(object, newScale, oldScale);
    expect(command.updatable).toBe(true);
  });

  it("should update with new scale", () => {
    const command = new SetScaleCommand(object, newScale, oldScale);
    const newerScale = new THREE.Vector3(5, 6, 7);
    const updateCommand = new SetScaleCommand(object, newerScale, newScale);

    command.update!(updateCommand);
    command.execute();

    expect(object.scale.x).toBe(5);
    expect(object.scale.y).toBe(6);
    expect(object.scale.z).toBe(7);
  });
});
