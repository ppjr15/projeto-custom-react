import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Decal, useTexture } from "@react-three/drei";
import * as THREE from "three";

import "./index.scss";

/** Altura da barriga a partir dos pés (0 = chão, 1 = topo). Centro da camisa. */
const ALTURA_BARRIGA = 0.52;

/** Largura da logomarca em relação à largura do modelo. */
const LARGURA_LOGOMARCA = 0.28;

const aplicarLado = (material, lado) => {
  if (Array.isArray(material)) material.forEach((m) => (m.side = lado));
  else if (material) material.side = lado;
};

/**
 * Orientação da logomarca no espaço local da malha: de frente para a câmera,
 * com o eixo Y do mundo para cima.
 */
const orientacaoLocalLogomarca = (mesh, pontoMundo) => {
  const dummy = new THREE.Object3D();
  dummy.position.copy(pontoMundo);
  dummy.up.set(0, 1, 0);
  dummy.lookAt(pontoMundo.x, pontoMundo.y, pontoMundo.z - 1);
  dummy.rotateY(Math.PI);
  dummy.rotateZ(Math.PI / Math.PI - 1);
  dummy.updateMatrixWorld(true);

  const localMatrix = mesh.matrixWorld
    .clone()
    .invert()
    .multiply(dummy.matrixWorld);
  const euler = new THREE.Euler().setFromRotationMatrix(localMatrix, "XYZ");
  return [euler.x, euler.y, euler.z];
};

/**
 * Ponto da barriga no centro da frente: raio vindo da câmera (−Z),
 * sem deslocamento lateral.
 */
const calcularLogomarcaFrontal = (mesh) => {
  mesh.updateWorldMatrix(true, false);

  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  if (size.lengthSq() === 0) return null;

  const yBarriga = box.min.y + size.y * ALTURA_BARRIGA;
  const xCentro = center.x;
  const origem = new THREE.Vector3(
    xCentro,
    yBarriga,
    box.min.z - Math.max(size.z, 0.001),
  );
  const direcao = new THREE.Vector3(0, 0, 1);

  const ladoAnterior = Array.isArray(mesh.material)
    ? mesh.material[0]?.side
    : mesh.material?.side;
  aplicarLado(mesh.material, THREE.DoubleSide);

  const raycaster = new THREE.Raycaster(origem, direcao, 0, size.z * 4);
  const hit = raycaster.intersectObject(mesh, false)[0];

  aplicarLado(mesh.material, ladoAnterior);

  const pontoMundo = hit
    ? hit.point
    : new THREE.Vector3(xCentro, yBarriga, box.min.z);
  const pontoLocal = mesh.worldToLocal(pontoMundo.clone());

  const lado = size.x * LARGURA_LOGOMARCA;
  const profundidade = Math.min(size.z * 0.18, lado * 0.7);

  return {
    position: [pontoLocal.x, pontoLocal.y, pontoLocal.z],
    rotation: orientacaoLocalLogomarca(mesh, pontoMundo),
    scale: [lado, lado, profundidade],
  };
};

const LogomarcaNaBarriga = ({ url, meshRef }) => {
  const mapa = useTexture(url);
  const { invalidate } = useThree();
  const [params, setParams] = useState(null);

  useLayoutEffect(() => {
    mapa.colorSpace = THREE.SRGBColorSpace;
    mapa.anisotropy = 16;
    mapa.needsUpdate = true;
    mapa.wrapS = THREE.RepeatWrapping;
    mapa.repeat.x = -1;
  }, [mapa]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    setParams(calcularLogomarcaFrontal(mesh));
    invalidate();
  }, [meshRef, mapa, invalidate]);

  if (!params) return null;

  return (
    <Decal
      position={params.position}
      rotation={params.rotation}
      scale={params.scale}
      map={mapa}
      depthTest
    >
      <meshBasicMaterial
        map={mapa}
        transparent
        alphaTest={0.08}
        depthTest
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-6}
        toneMapped={false}
      />
    </Decal>
  );
};

const useLogomarcaFrente = () => {
  const [urlLogomarca, setUrlLogomarca] = useState(null);
  const inputLogomarcaRef = useRef(null);

  useEffect(() => {
    return () => {
      if (urlLogomarca) URL.revokeObjectURL(urlLogomarca);
    };
  }, [urlLogomarca]);

  const aoEscolherLogomarca = (evento) => {
    const arquivo = evento.target.files?.[0];
    const ehImagem =
      arquivo &&
      (arquivo.type.startsWith("image/") ||
        /\.(png|jpe?g|webp)$/i.test(arquivo.name));
    if (!ehImagem) return;

    setUrlLogomarca(URL.createObjectURL(arquivo));
  };

  const removerLogomarca = () => {
    setUrlLogomarca(null);
    if (inputLogomarcaRef.current) inputLogomarcaRef.current.value = "";
  };

  return {
    urlLogomarca,
    inputLogomarcaRef,
    aoEscolherLogomarca,
    removerLogomarca,
  };
};

const ControleLogomarcaFrente = ({
  urlLogomarca,
  inputLogomarcaRef,
  aoEscolherLogomarca,
  removerLogomarca,
}) => (
  <div className="visualizador-3d__logomarca">
    <label className="visualizador-3d__logomarca-botao">
      {urlLogomarca ? "Trocar logomarca" : "Inserir logomarca na frente"}
      <input
        ref={inputLogomarcaRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={aoEscolherLogomarca}
      />
    </label>
    {urlLogomarca ? (
      <>
        <img
          className="visualizador-3d__logomarca-preview"
          src={urlLogomarca}
          alt="Logomarca selecionada"
        />
        <button
          type="button"
          className="visualizador-3d__logomarca-remover"
          onClick={removerLogomarca}
        >
          Remover
        </button>
      </>
    ) : null}
  </div>
);

const LogomarcaNoModelo = ({ url, meshRef }) => {
  if (!url) return null;

  return (
    <Suspense fallback={null}>
      <LogomarcaNaBarriga url={url} meshRef={meshRef} />
    </Suspense>
  );
};

export {
  calcularLogomarcaFrontal,
  ControleLogomarcaFrente,
  LogomarcaNoModelo,
  LogomarcaNaBarriga,
  orientacaoLocalLogomarca,
  useLogomarcaFrente,
};
