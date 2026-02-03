import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import { History } from "../../src/editor/History";
import { SetPositionCommand } from "../../src/editor/commands/SetPositionCommand";

describe("History", () => {
  let history: History;
  let object: THREE.Object3D;

  beforeEach(() => {
    history = new History();
    object = new THREE.Object3D();
    object.position.set(0, 0, 0);
  });

  it("should execute a command", () => {
    const command = new SetPositionCommand(
      object,
      new THREE.Vector3(10, 20, 30),
      new THREE.Vector3(0, 0, 0)
    );

    history.execute(command);

    expect(object.position.x).toBe(10);
    expect(object.position.y).toBe(20);
    expect(object.position.z).toBe(30);
  });

  it("should undo a command", () => {
    const command = new SetPositionCommand(
      object,
      new THREE.Vector3(10, 20, 30),
      new THREE.Vector3(0, 0, 0)
    );

    history.execute(command);
    history.undo();

    expect(object.position.x).toBe(0);
    expect(object.position.y).toBe(0);
    expect(object.position.z).toBe(0);
  });

  it("should redo an undone command", () => {
    const command = new SetPositionCommand(
      object,
      new THREE.Vector3(10, 20, 30),
      new THREE.Vector3(0, 0, 0)
    );

    history.execute(command);
    history.undo();
    history.redo();

    expect(object.position.x).toBe(10);
    expect(object.position.y).toBe(20);
    expect(object.position.z).toBe(30);
  });

  it("should report canUndo correctly", () => {
    expect(history.canUndo()).toBe(false);

    const command = new SetPositionCommand(
      object,
      new THREE.Vector3(10, 20, 30),
      new THREE.Vector3(0, 0, 0)
    );
    history.execute(command);

    expect(history.canUndo()).toBe(true);

    history.undo();
    expect(history.canUndo()).toBe(false);
  });

  it("should report canRedo correctly", () => {
    expect(history.canRedo()).toBe(false);

    const command = new SetPositionCommand(
      object,
      new THREE.Vector3(10, 20, 30),
      new THREE.Vector3(0, 0, 0)
    );
    history.execute(command);

    expect(history.canRedo()).toBe(false);

    history.undo();
    expect(history.canRedo()).toBe(true);

    history.redo();
    expect(history.canRedo()).toBe(false);
  });

  it("should clear redo stack on new action", () => {
    const command1 = new SetPositionCommand(
      object,
      new THREE.Vector3(10, 10, 10),
      new THREE.Vector3(0, 0, 0)
    );
    const command2 = new SetPositionCommand(
      object,
      new THREE.Vector3(20, 20, 20),
      new THREE.Vector3(10, 10, 10)
    );

    history.execute(command1);
    history.undo();
    expect(history.canRedo()).toBe(true);

    history.execute(command2);
    expect(history.canRedo()).toBe(false);
  });

  it("should clear all history", () => {
    const command = new SetPositionCommand(
      object,
      new THREE.Vector3(10, 20, 30),
      new THREE.Vector3(0, 0, 0)
    );

    history.execute(command);
    history.clear();

    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(history.getUndoCount()).toBe(0);
    expect(history.getRedoCount()).toBe(0);
  });

  it("should emit historyChanged event", () => {
    const callback = vi.fn();
    history.on("historyChanged", callback);

    const command = new SetPositionCommand(
      object,
      new THREE.Vector3(10, 20, 30),
      new THREE.Vector3(0, 0, 0)
    );

    history.execute(command);
    expect(callback).toHaveBeenCalledTimes(1);

    history.undo();
    expect(callback).toHaveBeenCalledTimes(2);

    history.redo();
    expect(callback).toHaveBeenCalledTimes(3);

    history.clear();
    expect(callback).toHaveBeenCalledTimes(4);
  });

  it("should return correct counts", () => {
    expect(history.getUndoCount()).toBe(0);
    expect(history.getRedoCount()).toBe(0);

    // Use different objects to prevent command merging
    const object1 = new THREE.Object3D();
    const object2 = new THREE.Object3D();

    const command1 = new SetPositionCommand(
      object1,
      new THREE.Vector3(10, 10, 10),
      new THREE.Vector3(0, 0, 0)
    );
    const command2 = new SetPositionCommand(
      object2,
      new THREE.Vector3(20, 20, 20),
      new THREE.Vector3(0, 0, 0)
    );

    history.execute(command1);
    expect(history.getUndoCount()).toBe(1);

    history.execute(command2);
    expect(history.getUndoCount()).toBe(2);

    history.undo();
    expect(history.getUndoCount()).toBe(1);
    expect(history.getRedoCount()).toBe(1);
  });

  it("should handle multiple undo/redo operations", () => {
    // Use different objects to prevent command merging
    const objects = [
      new THREE.Object3D(),
      new THREE.Object3D(),
      new THREE.Object3D(),
    ];

    // Execute 3 commands on different objects
    objects[0].position.set(0, 0, 0);
    objects[1].position.set(0, 0, 0);
    objects[2].position.set(0, 0, 0);

    const command1 = new SetPositionCommand(
      objects[0],
      new THREE.Vector3(10, 10, 10),
      new THREE.Vector3(0, 0, 0)
    );
    const command2 = new SetPositionCommand(
      objects[1],
      new THREE.Vector3(20, 20, 20),
      new THREE.Vector3(0, 0, 0)
    );
    const command3 = new SetPositionCommand(
      objects[2],
      new THREE.Vector3(30, 30, 30),
      new THREE.Vector3(0, 0, 0)
    );

    history.execute(command1);
    history.execute(command2);
    history.execute(command3);

    expect(objects[0].position.x).toBe(10);
    expect(objects[1].position.x).toBe(20);
    expect(objects[2].position.x).toBe(30);

    // Undo all
    history.undo();
    expect(objects[2].position.x).toBe(0);
    history.undo();
    expect(objects[1].position.x).toBe(0);
    history.undo();
    expect(objects[0].position.x).toBe(0);

    // Redo all
    history.redo();
    expect(objects[0].position.x).toBe(10);
    history.redo();
    expect(objects[1].position.x).toBe(20);
    history.redo();
    expect(objects[2].position.x).toBe(30);
  });
});
