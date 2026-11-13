import React, { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import '../../types';
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, ContactShadows } from "@react-three/drei";

const GLB_URL = "/models/avatar.glb";
const FIT_MARGIN = 1.12;
const SPIN_SPEED = 0.6;

const VioletLights: React.FC = () => (
  <>
    <ambientLight intensity={0.35} color="#c4b5fd" />
    <spotLight intensity={60} position={[2, 3, 2]} angle={Math.PI / 5} penumbra={0.5} color="#ffffff" />
    <pointLight intensity={30} position={[-2.5, 1.5, -1.5]} color="#b69df8" />
    <pointLight intensity={25} position={[2.5, 0.5, -2]} color="#d0bfff" />
    <directionalLight intensity={1.2} position={[0, 2, -3]} color="#9d86e9" />
  </>
);

const SpinningAvatar: React.FC = () => {
  const { scene } = useGLTF(GLB_URL);
  const groupRef = useRef<THREE.Group>(null);
  const { camera, size } = useThree();

  // Measure the model in isolation and center it on the origin, so framing
  // doesn't depend on where the GLB's own pivot happens to be.
  const dims = useMemo(() => {
    const parent = scene.parent;
    parent?.remove(scene);
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0);
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const extent = box.getSize(new THREE.Vector3());
    scene.position.sub(center);
    parent?.add(scene);
    return extent;
  }, [scene]);

  // Pull the camera back far enough that the whole body — head to shoes —
  // fits the canvas at every rotation angle and aspect ratio.
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const tanHalfV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const aspect = size.width / size.height;
    const spinWidth = Math.hypot(dims.x, dims.z);
    const distForHeight = (dims.y * FIT_MARGIN) / 2 / tanHalfV;
    const distForWidth = (spinWidth * FIT_MARGIN) / 2 / (tanHalfV * aspect);
    const dist = Math.max(distForHeight, distForWidth) + spinWidth / 2;
    cam.position.set(0, 0, dist);
    cam.near = dist / 100;
    cam.far = dist * 10;
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, dims]);

  useFrame((_state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * SPIN_SPEED;
  });

  return (
    <>
      <group ref={groupRef}>
        <primitive object={scene} />
      </group>
      <ContactShadows
        position={[0, -dims.y / 2, 0]}
        opacity={0.5}
        scale={dims.y * 1.5}
        blur={2.5}
        color="#3b2a6b"
      />
    </>
  );
};

useGLTF.preload(GLB_URL);

const Avatar: React.FC<{ className?: string }> = ({ className }) => (
  <Canvas
    className={className}
    dpr={[1, 2]}
    gl={{
      antialias: true,
      alpha: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      outputColorSpace: THREE.SRGBColorSpace,
    }}
    camera={{ fov: 35, position: [0, 0, 5] }}
  >
    <Suspense fallback={null}>
      <Environment preset="night" background={false} />
      <SpinningAvatar />
      <VioletLights />
    </Suspense>
  </Canvas>
);

export default Avatar;
