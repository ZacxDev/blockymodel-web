import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { SetPropertyCommand } from "../../../src/editor/commands/SetPropertyCommand";

describe("SetPropertyCommand", () => {
  let object: THREE.Object3D;

  beforeEach(() => {
    object = new THREE.Object3D();
    object.name = "TestObject";
    object.visible = true;
    object.userData = { customProp: "oldValue", nested: { value: 10 } };
  });

  it("should execute and set simple property", () => {
    const command = new SetPropertyCommand(object, "name", "NewName", "TestObject");
    command.execute();

    expect(object.name).toBe("NewName");
  });

  it("should undo and restore simple property", () => {
    const command = new SetPropertyCommand(object, "name", "NewName", "TestObject");
    command.execute();
    command.undo();

    expect(object.name).toBe("TestObject");
  });

  it("should execute and set nested property", () => {
    const command = new SetPropertyCommand(object, "userData.customProp", "newValue", "oldValue");
    command.execute();

    expect(object.userData.customProp).toBe("newValue");
  });

  it("should undo and restore nested property", () => {
    const command = new SetPropertyCommand(object, "userData.customProp", "newValue", "oldValue");
    command.execute();
    command.undo();

    expect(object.userData.customProp).toBe("oldValue");
  });

  it("should handle deeply nested properties", () => {
    const command = new SetPropertyCommand(object, "userData.nested.value", 100, 10);
    command.execute();

    expect(object.userData.nested.value).toBe(100);
  });

  it("should have correct type", () => {
    const command = new SetPropertyCommand(object, "name", "NewName", "TestObject");
    expect(command.type).toBe("SetProperty");
  });

  it("should be updatable", () => {
    const command = new SetPropertyCommand(object, "name", "NewName", "TestObject");
    expect(command.updatable).toBe(true);
  });

  it("should handle boolean properties", () => {
    const command = new SetPropertyCommand(object, "visible", false, true);
    command.execute();

    expect(object.visible).toBe(false);
  });

  it("should handle object values by cloning", () => {
    const newObj = { x: 1, y: 2 };
    const command = new SetPropertyCommand(object, "userData.coords", newObj, null);
    command.execute();

    // Should be equal but not same reference
    expect(object.userData.coords).toEqual({ x: 1, y: 2 });
    expect(object.userData.coords).not.toBe(newObj);
  });
});
