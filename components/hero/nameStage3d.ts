import * as THREE from "three";
import { NAME_PERSPECTIVE, NAME_PERSPECTIVE_ORIGIN_Y, NAME_TILT_DEG } from "./nameStage";

// WebGL counterpart of the CSS 3D name stage, so 3D objects line up exactly with the letters.
// World units are CSS pixels, origin at the name's top-left, y up, z toward the viewer.

/**
 * Right-handed floor frame. A floor point (x, v, h), where v is measured from the letters' far (top)
 * edge and h is height above the floor, sits at local (x, -v, h) inside a group using this matrix.
 */
export function floorMatrix(H: number) {
  const a = THREE.MathUtils.degToRad(NAME_TILT_DEG);
  const m = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, Math.cos(a), -Math.sin(a)),
    new THREE.Vector3(0, Math.sin(a), Math.cos(a))
  );
  m.setPosition(0, -H + H * Math.cos(a), -H * Math.sin(a));
  return m;
}

/** Clipping plane that hides anything below the floor. */
export function floorClipPlane(H: number) {
  const a = THREE.MathUtils.degToRad(NAME_TILT_DEG);
  return new THREE.Plane(new THREE.Vector3(0, Math.sin(a), Math.cos(a)), H * Math.sin(a));
}

/**
 * The same camera as the CSS `perspective` on the name, cropped to a canvas that overhangs the
 * name by padX (fraction of its width, each side), padY above and padBottom below (fractions of its height).
 */
export function stageCamera(W: number, H: number, padX: number, padY: number, padBottom = padY) {
  const P = NAME_PERSPECTIVE * H;
  const eye = new THREE.Vector3(W / 2, -NAME_PERSPECTIVE_ORIGIN_Y * H, P);
  const camera = new THREE.PerspectiveCamera();
  camera.position.copy(eye);
  camera.updateMatrixWorld();
  const near = P * 0.05;
  const k = near / P;
  camera.projectionMatrix.makePerspective(
    (-padX * W - eye.x) * k,
    (W + padX * W - eye.x) * k,
    (padY * H - eye.y) * k,
    (-(H + padBottom * H) - eye.y) * k,
    near,
    P * 4
  );
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  return camera;
}
