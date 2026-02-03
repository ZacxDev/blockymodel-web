import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { SetRotationCommand } from "../../../src/editor/commands/SetRotationCommand";

describe("SetRotationCommand", () => {
  let object: THREE.Object3D;
  let oldRotation: THREE.Euler;
  let newRotation: THREE.Euler;

  beforeEach(() => {
    object = new THREE.Object3D();
    object.rotation.set(0.1, 0.2, 0.3);
    oldRotation = object.rotation.clone();
    newRotation = new THREE.Euler(1.0, 2.0, 3.0);
  });

  it("should execute and set new rotation", () => {
    const command = new SetRotationCommand(object, newRotation, oldRotation);
    command.execute();

    expect(object.rotation.x).toBeCloseTo(1.0);
    expect(object.rotation.y).toBeCloseTo(2.0);
    expect(object.rotation.z).toBeCloseTo(3.0);
  });

  it("should undo and restore old rotation", () => {
    const command = new SetRotationCommand(object, newRotation, oldRotation);
    command.execute();
    command.undo();

    expect(object.rotation.x).toBeCloseTo(0.1);
    expect(object.rotation.y).toBeCloseTo(0.2);
    expect(object.rotation.z).toBeCloseTo(0.3);
  });

  it("should have correct type", () => {
    const command = new SetRotationCommand(object, newRotation, oldRotation);
    expect(command.type).toBe("SetRotation");
  });

  it("should be updatable", () => {
    const command = new SetRotationCommand(object, newRotation, oldRotation);
    expect(command.updatable).toBe(true);
  });

  it("should update with new rotation", () => {
    const command = new SetRotationCommand(object, newRotation, oldRotation);
    const newerRotation = new THREE.Euler(0.5, 0.6, 0.7);
    const updateCommand = new SetRotationCommand(object, newerRotation, newRotation);

    command.update!(updateCommand);
    command.execute();

    expect(object.rotation.x).toBeCloseTo(0.5);
    expect(object.rotation.y).toBeCloseTo(0.6);
    expect(object.rotation.z).toBeCloseTo(0.7);
  });
});
