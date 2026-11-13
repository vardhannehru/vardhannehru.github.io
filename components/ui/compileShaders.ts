/// <reference types="vite/client" />
import * as THREE from 'three';

/**
 * Same job as `renderer.compileAsync(scene, camera)`: build every shader the scene needs without stalling a frame,
 * and resolve once they're ready. three's version keeps polling on a timer and throws an uncaught
 * "Cannot read properties of undefined (reading 'isReady')" when a material is disposed before it finishes (the
 * scene torn down by a route change or React's dev double-mount). This one drops those materials instead, and stops
 * as soon as `alive()` turns false.
 */
export function compileShaders(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Object3D,
  camera: THREE.Camera,
  alive: () => boolean = () => true,
): Promise<void> {
  // Reading back every shader's error log when it's first used blocks the page (about 200 ms for the TV). Only
  // worth it while developing.
  if (!import.meta.env.DEV) renderer.debug.checkShaderErrors = false;
  const pending = new Set<THREE.Material>(renderer.compile(scene, camera) as unknown as Iterable<THREE.Material>);
  const parallel = renderer.extensions.has('KHR_parallel_shader_compile');
  return new Promise((resolve) => {
    const check = () => {
      if (!alive()) return resolve();
      pending.forEach((m) => {
        const program = (renderer.properties.get(m) as { currentProgram?: { isReady(): boolean } }).currentProgram;
        if (!program || program.isReady()) pending.delete(m);
      });
      if (pending.size === 0) resolve();
      else setTimeout(check, 10);
    };
    // Without the parallel-compile extension, asking whether a program is ready blocks until it is, so wait a tick.
    if (parallel) check();
    else setTimeout(check, 10);
  });
}
