import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BlockyModelLoader, applyTextureToModel } from "../loaders/BlockyModelLoader";

export interface ViewerOptions {
  container: HTMLElement;
  backgroundColor?: number;
}

/**
 * Main viewer controller
 * Manages Three.js scene, camera, controls, and model loading
 */
export class ViewerController {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly controls: OrbitControls;
  public readonly domElement: HTMLElement;

  private loader: BlockyModelLoader;
  private textureLoader: THREE.TextureLoader;
  private currentModel: THREE.Group | null = null;
  private animationId: number | null = null;

  constructor(options: ViewerOptions) {
    const { container, backgroundColor = 0x1a1a2e } = options;

    this.domElement = container;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(backgroundColor);

    // Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    this.camera.position.set(50, 50, 100);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Controls setup
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 500;

    // Loaders
    this.loader = new BlockyModelLoader();
    this.textureLoader = new THREE.TextureLoader();

    // Lighting
    this.setupLighting();

    // Grid helper
    this.setupHelpers();

    // Handle resize
    window.addEventListener("resize", () => this.handleResize(container));

    // Start render loop
    this.animate();
  }

  private setupLighting(): void {
    // Ambient light for base illumination
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(50, 100, 50);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    this.scene.add(mainLight);

    // Fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-50, 50, -50);
    this.scene.add(fillLight);

    // Rim light for edge definition
    const rimLight = new THREE.DirectionalLight(0x88ccff, 0.2);
    rimLight.position.set(0, -50, -100);
    this.scene.add(rimLight);
  }

  private setupHelpers(): void {
    // Grid on XZ plane
    const grid = new THREE.GridHelper(200, 20, 0x444444, 0x333333);
    grid.position.y = -0.1;
    this.scene.add(grid);

    // Axes helper
    const axes = new THREE.AxesHelper(20);
    this.scene.add(axes);
  }

  private handleResize(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Load a .blockymodel file
   */
  async loadModel(file: File): Promise<THREE.Group> {
    // Remove existing model
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.disposeModel(this.currentModel);
      this.currentModel = null;
    }

    try {
      this.currentModel = await this.loader.loadFromFile(file);
      this.scene.add(this.currentModel);

      // Center and fit camera to model
      this.fitCameraToModel();

      console.log(`Loaded model with ${this.countMeshes(this.currentModel)} meshes`);
      return this.currentModel;
    } catch (error) {
      console.error("Failed to load model:", error);
      throw error;
    }
  }

  /**
   * Get the currently loaded model
   */
  getModel(): THREE.Group | null {
    return this.currentModel;
  }

  /**
   * Load a texture and apply to current model
   * @returns The loaded texture, or null if no model is loaded
   */
  async loadTexture(file: File): Promise<THREE.Texture | null> {
    if (!this.currentModel) {
      console.warn("No model loaded to apply texture to");
      return null;
    }

    const url = URL.createObjectURL(file);

    try {
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        this.textureLoader.load(url, resolve, undefined, reject);
      });

      applyTextureToModel(this.currentModel, texture);
      console.log("Texture applied");
      return texture;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Fit camera to view the entire model
   */
  fitCameraToModel(): void {
    if (!this.currentModel) return;

    const box = new THREE.Box3().setFromObject(this.currentModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const cameraDistance = maxDim / (2 * Math.tan(fov / 2)) * 1.5;

    this.camera.position.set(
      center.x + cameraDistance * 0.5,
      center.y + cameraDistance * 0.5,
      center.z + cameraDistance
    );

    this.controls.target.copy(center);
    this.controls.update();
  }

  /**
   * Reset camera to default position
   */
  resetCamera(): void {
    if (this.currentModel) {
      this.fitCameraToModel();
    } else {
      this.camera.position.set(50, 50, 100);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  /**
   * Set background color
   */
  setBackgroundColor(color: number | string): void {
    this.scene.background = new THREE.Color(color);
  }

  /**
   * Toggle wireframe mode on all meshes
   */
  toggleWireframe(enabled: boolean): void {
    this.currentModel?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = object.material as THREE.MeshStandardMaterial;
        material.wireframe = enabled;
      }
    });
  }

  toggleDoubleSide(enabled: boolean): void {
    this.currentModel?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = object.material as THREE.MeshStandardMaterial;
        material.side = enabled ? THREE.DoubleSide : THREE.FrontSide;
      }
    });
  }

  /**
   * Get model hierarchy for debugging
   */
  getModelHierarchy(): object | null {
    if (!this.currentModel) return null;

    const buildHierarchy = (object: THREE.Object3D): object => ({
      name: object.name,
      type: object.type,
      userData: object.userData,
      children: object.children.map(buildHierarchy),
    });

    return buildHierarchy(this.currentModel);
  }

  /**
   * Count meshes in model
   */
  private countMeshes(object: THREE.Object3D): number {
    let count = 0;
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) count++;
    });
    return count;
  }

  /**
   * Dispose of model resources
   */
  private disposeModel(model: THREE.Group): void {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.currentModel) {
      this.disposeModel(this.currentModel);
    }

    this.controls.dispose();
    this.renderer.dispose();
  }
}
