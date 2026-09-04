import { Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Center,
  ContactShadows,
} from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";

import {
  ControleEscudo,
  EscudoNoModelo,
  useEscudo,
} from "./components/funcoes/escudo/index.jsx";
import {
  ControleLogomarcaFrente,
  LogomarcaNoModelo,
  useLogomarcaFrente,
} from "./components/funcoes/logomarcaFrente/index.jsx";
import {
  ControleLogomarcaCosta,
  LogomarcaCostaNoModelo,
  useLogomarcaCosta,
} from "./components/funcoes/logamarcaCosta/index.jsx";

import "./index.scss";

/** Em pé (Y-up). A face fica no -Z — a câmera enquadra desse lado. */
const ROTACAO_FRONTAL = [Math.PI / 2, Math.PI, 0];

/** Folga extra no enquadramento para o objeto não colar nas bordas. */
const MARGEM_ENQUADRAMENTO = 1.35;

const Modelo = ({
  arquivo,
  urlEscudo,
  urlLogomarca,
  urlLogomarcaCostaSuperior,
  urlLogomarcaCostaInferior,
}) => {
  const meshRef = useRef(null);
  const geometria = useLoader(STLLoader, arquivo);

  const geo = useMemo(() => {
    const clone = geometria.clone();
    clone.computeVertexNormals();
    clone.center();
    return clone;
  }, [geometria]);

  return (
    <mesh
      ref={meshRef}
      geometry={geo}
      castShadow
      receiveShadow
      rotation={ROTACAO_FRONTAL}
    >
      <meshStandardMaterial color="red" metalness={0.1} roughness={0.5} />
      <EscudoNoModelo url={urlEscudo} meshRef={meshRef} />
      <LogomarcaNoModelo url={urlLogomarca} meshRef={meshRef} />
      <LogomarcaCostaNoModelo
        urlSuperior={urlLogomarcaCostaSuperior}
        urlInferior={urlLogomarcaCostaInferior}
        meshRef={meshRef}
      />
    </mesh>
  );
};

/**
 * Enquadra a câmera na frente do objeto, na altura dos olhos (não por cima).
 * Distância e limites de zoom acompanham o bounding box — funciona com
 * modelos de escalas diferentes sem entrar dentro da malha.
 */
const EnquadrarFrontal = ({ children, arquivo }) => {
  const groupRef = useRef(null);
  const { camera, controls, invalidate } = useThree();

  useLayoutEffect(() => {
    if (!groupRef.current) return;

    const box = new THREE.Box3().setFromObject(groupRef.current);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    if (size.lengthSq() === 0) return;

    const fov = THREE.MathUtils.degToRad(camera.fov);
    const halfFovTan = Math.tan(fov / 2);
    const aspect = camera.aspect || 1;

    const distAltura = size.y / 2 / halfFovTan;
    const distLargura = size.x / 2 / halfFovTan / aspect;
    const distProfundidade = size.z / 2000;

    const distance =
      Math.max(distAltura, distLargura) * MARGEM_ENQUADRAMENTO +
      distProfundidade;

    const minDistance = Math.max(distProfundidade * 1.15, distance * 0.4);
    const maxDistance = distance * 5;

    const offset = new THREE.Vector3().setFromSphericalCoords(
      distance,
      Math.PI / 2,
      Math.PI,
    );

    if (controls) {
      controls.target.copy(center);
      controls.minDistance = minDistance;
      controls.maxDistance = maxDistance;
      camera.position.copy(center).add(offset);
      controls.update();
    } else {
      camera.position.copy(center).add(offset);
      camera.lookAt(center);
    }

    camera.near = Math.max(distance / 100, 0.01);
    camera.far = Math.max(distance * 100, size.length() * 20);
    camera.updateProjectionMatrix();
    invalidate();
  }, [arquivo, camera, controls, invalidate]);

  return <group ref={groupRef}>{children}</group>;
};

/** Luz que acompanha a câmera — ilumina a face vista (sem projetar sombra) */
const LuzFrontal = () => {
  const lightRef = useRef(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!lightRef.current) return;
    lightRef.current.position.copy(camera.position);
  });

  return <directionalLight ref={lightRef} intensity={0.7} />;
};

/**
 * Modelo apoiado no chão (y=0) + sombra projetada pela luz de cima
 * e contact shadow suave sob os pés.
 */
const CenaComSombra = ({ children }) => {
  const contentRef = useRef(null);
  const lightRef = useRef(null);
  const [shadowSpan, setShadowSpan] = useState(20);

  useLayoutEffect(() => {
    if (!contentRef.current) return;

    const box = new THREE.Box3().setFromObject(contentRef.current);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z, size.y * 0.5) * 1.2;
    setShadowSpan(span);

    const light = lightRef.current;
    if (light) {
      const h = Math.max(size.y * 2.2, span);
      light.position.set(span * 0.45, h, span * 0.35);
      light.target.position.set(0, 0, 0);
      light.target.updateMatrixWorld();

      const cam = light.shadow.camera;
      cam.left = -span;
      cam.right = span;
      cam.top = span;
      cam.bottom = -span;
      cam.near = 0.5;
      cam.far = h + span * 2;
      cam.updateProjectionMatrix();
    }
  }, [children]);

  return (
    <>
      <ambientLight intensity={0.45} />
      <hemisphereLight intensity={0.35} color="#ffffff" groundColor="#444444" />

      <directionalLight
        ref={lightRef}
        intensity={1.35}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
      />

      <group ref={contentRef}>{children}</group>

      {/* Chão que recebe a sombra projetada */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[shadowSpan * 6, shadowSpan * 6]} />
        <shadowMaterial transparent opacity={0.35} />
      </mesh>

      {/* Sombra de contato sob o objeto */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.55}
        scale={shadowSpan * 3}
        blur={2.8}
        far={shadowSpan}
        resolution={1024}
        color="#000000"
        frames={1}
      />
    </>
  );
};

const ComponenteVisualizador3D = ({ objeto }) => {
  const escudo = useEscudo();
  const logomarca = useLogomarcaFrente();
  const logomarcaCosta = useLogomarcaCosta();

  return (
    <div className="visualizador-3d">
      <div className="visualizador-3d__controles">
        <ControleEscudo {...escudo} />
        <ControleLogomarcaFrente {...logomarca} />
        <ControleLogomarcaCosta {...logomarcaCosta} />
      </div>

      <Canvas
        shadows
        camera={{
          position: [0, 100, 10],
          fov: 45,
          near: 0.1,
          far: 2000,
        }}
      >
        <Suspense fallback={null}>
          <Environment preset="sunset" environmentIntensity={0.4} />

          <CenaComSombra>
            <EnquadrarFrontal arquivo={objeto?.STL}>
              {/* top: base do modelo no y=0 → sombra no chão */}
              <Center top>
                <Modelo
                  key={objeto?.STL}
                  arquivo={objeto.STL}
                  urlEscudo={escudo.urlEscudo}
                  urlLogomarca={logomarca.urlLogomarca}
                  urlLogomarcaCostaSuperior={logomarcaCosta.superior.url}
                  urlLogomarcaCostaInferior={logomarcaCosta.inferior.url}
                />
              </Center>
            </EnquadrarFrontal>
          </CenaComSombra>

          <LuzFrontal />
        </Suspense>

        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          enablePan={false}
          enableZoom
          enableRotate
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.8}
        />
      </Canvas>
    </div>
  );
};

export default ComponenteVisualizador3D;
