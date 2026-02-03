import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { Serializer } from "../../src/editor/Serializer";
import type { BlockyModel } from "../../src/types/blockymodel";

describe("Serializer", () => {
  let serializer: Serializer;
  let model: THREE.Group;

  beforeEach(() => {
    serializer = new Serializer();

    // Create a test model
    model = new THREE.Group();
    model.name = "BlockyModel";
    model.userData.format = "prop";
    model.userData.lod = "auto";

    // Add a root node
    const root = new THREE.Group();
    root.name = "RootNode";
    root.userData.id = "root";
    root.position.set(0, 0, 0);

    // Add a box mesh
    const geometry = new THREE.BoxGeometry(10, 20, 30);
    const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const box = new THREE.Mesh(geometry, material);
    box.name = "TestBox";
    box.userData.id = "box1";
    box.userData.shapeType = "box";
    box.userData.originalSize = { x: 10, y: 20, z: 30 };
    box.position.set(5, 10, 15);

    root.add(box);
    model.add(root);
  });

  it("should serialize model to BlockyModel format", () => {
    const result = serializer.serialize(model);

    expect(result.format).toBe("prop");
    expect(result.lod).toBe("auto");
    expect(result.nodes).toHaveLength(1);
  });

  it("should preserve node hierarchy", () => {
    const result = serializer.serialize(model);

    expect(result.nodes[0].name).toBe("RootNode");
    expect(result.nodes[0].children).toHaveLength(1);
    expect(result.nodes[0].children[0].name).toBe("TestBox");
  });

  it("should serialize position correctly", () => {
    const result = serializer.serialize(model);
    const box = result.nodes[0].children[0];

    expect(box.position?.x).toBe(5);
    expect(box.position?.y).toBe(10);
    expect(box.position?.z).toBe(15);
  });

  it("should serialize quaternion correctly", () => {
    // Set a rotation
    const box = model.children[0].children[0];
    box.quaternion.setFromEuler(new THREE.Euler(Math.PI / 4, 0, 0));

    const result = serializer.serialize(model);
    const serializedBox = result.nodes[0].children[0];

    expect(serializedBox.orientation?.w).toBeCloseTo(0.9239, 3);
    expect(serializedBox.orientation?.x).toBeCloseTo(0.3827, 3);
    expect(serializedBox.orientation?.y).toBeCloseTo(0, 3);
    expect(serializedBox.orientation?.z).toBeCloseTo(0, 3);
  });

  it("should serialize shape data correctly", () => {
    const result = serializer.serialize(model);
    const box = result.nodes[0].children[0];

    expect(box.shape.type).toBe("box");
    expect(box.shape.settings.size?.x).toBe(10);
    expect(box.shape.settings.size?.y).toBe(20);
    expect(box.shape.settings.size?.z).toBe(30);
  });

  it("should preserve node IDs", () => {
    const result = serializer.serialize(model);

    expect(result.nodes[0].id).toBe("root");
    expect(result.nodes[0].children[0].id).toBe("box1");
  });

  it("should generate ID if not present", () => {
    const noIdBox = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial()
    );
    noIdBox.name = "NoIdBox";
    noIdBox.userData.shapeType = "box";
    model.children[0].add(noIdBox);

    const result = serializer.serialize(model);
    const serializedNoIdBox = result.nodes[0].children[1];

    expect(serializedNoIdBox.id).toBeDefined();
    expect(serializedNoIdBox.id.length).toBeGreaterThan(0);
  });

  it("should convert to JSON string", () => {
    const json = serializer.toJSON(model);
    const parsed = JSON.parse(json) as BlockyModel;

    expect(parsed.format).toBe("prop");
    expect(parsed.nodes).toHaveLength(1);
  });

  it("should skip helper objects", () => {
    // Add a helper that should be skipped
    const grid = new THREE.GridHelper(100, 10);
    model.add(grid);

    const axes = new THREE.AxesHelper(10);
    model.add(axes);

    const result = serializer.serialize(model);

    // Should only have RootNode, not the helpers
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].name).toBe("RootNode");
  });

  it("should serialize empty children array for leaf nodes", () => {
    const result = serializer.serialize(model);
    const box = result.nodes[0].children[0];

    expect(box.children).toEqual([]);
  });

  it("should serialize doubleSided from material", () => {
    const box = model.children[0].children[0] as THREE.Mesh;
    (box.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;

    const result = serializer.serialize(model);
    const serializedBox = result.nodes[0].children[0];

    expect(serializedBox.shape.doubleSided).toBe(true);
  });

  it("should serialize default texture layout", () => {
    const result = serializer.serialize(model);
    const box = result.nodes[0].children[0];

    expect(box.shape.textureLayout).toBeDefined();
    expect(box.shape.textureLayout.front).toBeDefined();
    expect(box.shape.textureLayout.back).toBeDefined();
    expect(box.shape.textureLayout.left).toBeDefined();
    expect(box.shape.textureLayout.right).toBeDefined();
    expect(box.shape.textureLayout.top).toBeDefined();
    expect(box.shape.textureLayout.bottom).toBeDefined();
  });

  it("should serialize visibility", () => {
    const box = model.children[0].children[0];
    box.visible = false;

    const result = serializer.serialize(model);
    const serializedBox = result.nodes[0].children[0];

    expect(serializedBox.shape.visible).toBe(false);
  });
});
