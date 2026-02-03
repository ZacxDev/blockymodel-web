import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { SetPositionCommand } from "../../../src/editor/commands/SetPositionCommand";

describe("SetPositionCommand", () => {
  let object: THREE.Object3D;
  let oldPosition: THREE.Vector3;
  let newPosition: THREE.Vector3;

  beforeEach(() => {
    object = new THREE.Object3D();
    object.position.set(10, 20, 30);
    oldPosition = object.position.clone();
    newPosition = new THREE.Vector3(100, 200, 300);
  });

  it("should execute and set new position", () => {
    const command = new SetPositionCommand(object, newPosition, oldPosition);
    command.execute();

    expect(object.position.x).toBe(100);
    expect(object.position.y).toBe(200);
    expect(object.position.z).toBe(300);
  });

  it("should undo and restore old position", () => {
    const command = new SetPositionCommand(object, newPosition, oldPosition);
    command.execute();
    command.undo();

    expect(object.position.x).toBe(10);
    expect(object.position.y).toBe(20);
    expect(object.position.z).toBe(30);
  });

  it("should have correct type", () => {
    const command = new SetPositionCommand(object, newPosition, oldPosition);
    expect(command.type).toBe("SetPosition");
  });

  it("should be updatable", () => {
    const command = new SetPositionCommand(object, newPosition, oldPosition);
    expect(command.updatable).toBe(true);
  });

  it("should update with new position", () => {
    const command = new SetPositionCommand(object, newPosition, oldPosition);
    const newerPosition = new THREE.Vector3(500, 600, 700);
    const updateCommand = new SetPositionCommand(object, newerPosition, newPosition);

    command.update!(updateCommand);
    command.execute();

    expect(object.position.x).toBe(500);
    expect(object.position.y).toBe(600);
    expect(object.position.z).toBe(700);
  });

  it("should return cloned positions", () => {
    const command = new SetPositionCommand(object, newPosition, oldPosition);

    const returnedNew = command.getNewPosition();
    const returnedOld = command.getOldPosition();

    // Should be equal but not same reference
    expect(returnedNew.equals(newPosition)).toBe(true);
    expect(returnedNew).not.toBe(newPosition);
    expect(returnedOld.equals(oldPosition)).toBe(true);
    expect(returnedOld).not.toBe(oldPosition);
  });
});
