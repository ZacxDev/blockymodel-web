import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { AddNodeCommand } from "../../../src/editor/commands/AddNodeCommand";
import { RemoveNodeCommand } from "../../../src/editor/commands/RemoveNodeCommand";

describe("AddNodeCommand", () => {
  let parent: THREE.Object3D;
  let child: THREE.Object3D;

  beforeEach(() => {
    parent = new THREE.Object3D();
    parent.name = "Parent";
    child = new THREE.Object3D();
    child.name = "Child";
  });

  it("should execute and add child to parent", () => {
    const command = new AddNodeCommand(parent, child);
    command.execute();

    expect(parent.children).toContain(child);
    expect(child.parent).toBe(parent);
  });

  it("should undo and remove child from parent", () => {
    const command = new AddNodeCommand(parent, child);
    command.execute();
    command.undo();

    expect(parent.children).not.toContain(child);
  });

  it("should have correct type", () => {
    const command = new AddNodeCommand(parent, child);
    expect(command.type).toBe("AddNode");
  });

  it("should not be updatable", () => {
    const command = new AddNodeCommand(parent, child);
    expect(command.updatable).toBe(false);
  });

  it("should add at specified index", () => {
    const existingChild = new THREE.Object3D();
    existingChild.name = "ExistingChild";
    parent.add(existingChild);

    const command = new AddNodeCommand(parent, child, 0);
    command.execute();

    expect(parent.children[0]).toBe(child);
    expect(parent.children[1]).toBe(existingChild);
  });

  it("should return child and parent", () => {
    const command = new AddNodeCommand(parent, child);
    expect(command.getChild()).toBe(child);
    expect(command.getParent()).toBe(parent);
  });
});

describe("RemoveNodeCommand", () => {
  let parent: THREE.Object3D;
  let child: THREE.Object3D;

  beforeEach(() => {
    parent = new THREE.Object3D();
    parent.name = "Parent";
    child = new THREE.Object3D();
    child.name = "Child";
    parent.add(child);
  });

  it("should execute and remove child from parent", () => {
    const command = new RemoveNodeCommand(child);
    command.execute();

    expect(parent.children).not.toContain(child);
  });

  it("should undo and restore child to parent", () => {
    const command = new RemoveNodeCommand(child);
    command.execute();
    command.undo();

    expect(parent.children).toContain(child);
  });

  it("should have correct type", () => {
    const command = new RemoveNodeCommand(child);
    expect(command.type).toBe("RemoveNode");
  });

  it("should not be updatable", () => {
    const command = new RemoveNodeCommand(child);
    expect(command.updatable).toBe(false);
  });

  it("should throw error if child has no parent", () => {
    const orphan = new THREE.Object3D();
    expect(() => new RemoveNodeCommand(orphan)).toThrow();
  });

  it("should restore to original index", () => {
    const child2 = new THREE.Object3D();
    child2.name = "Child2";
    parent.add(child2);

    // Remove first child
    const command = new RemoveNodeCommand(child);
    command.execute();

    expect(parent.children[0]).toBe(child2);

    // Undo should restore at original index
    command.undo();
    expect(parent.children[0]).toBe(child);
    expect(parent.children[1]).toBe(child2);
  });

  it("should return child, parent, and index", () => {
    const command = new RemoveNodeCommand(child);
    expect(command.getChild()).toBe(child);
    expect(command.getParent()).toBe(parent);
    expect(command.getIndex()).toBe(0);
  });
});
