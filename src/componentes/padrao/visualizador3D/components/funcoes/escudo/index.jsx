import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Decal, useTexture } from "@react-three/drei";
import * as THREE from "three";

import "./index.scss";

/** Altura do peito a partir dos pés (0 = chão, 1 = topo da cabeça). */
const ALTURA_PEITO = 0.76;

/** Largura do escudo em relação à largura do modelo. */
const LARGURA_ESCUDO = 0.14;

/**
 * Deslocamento horizontal no peito (fração da largura).
 * Negativo = peito direito de quem veste (esquerda da tela, personagem de frente).
 */
const DESLOCAMENTO_LATERAL = -0.14;

const aplicarLado = (material, lado) => {
  if (Array.isArray(material)) material.forEach((m) => (m.side = lado));
  else if (material) material.side = lado;
};

/**
 * Orientação do escudo no espaço local da malha: de frente para a câmera,
 * com o eixo Y do mundo para cima — evita ficar de lado na curva do peito.
 */
const orientacaoLocalEscudo = (mesh, pontoMundo) => {
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
 * Ponto do peito no espaço local da malha: raio vindo da câmera (−Z)
 * para não cair nas costas, com DoubleSide para STL com normal invertida.
 */
const calcularEscudoFrontal = (mesh) => {
  mesh.updateWorldMatrix(true, false);

  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  if (size.lengthSq() === 0) return null;

  const yPeito = box.min.y + size.y * ALTURA_PEITO;
  const xPeito = center.x + size.x * DESLOCAMENTO_LATERAL;
  const origem = new THREE.Vector3(
    xPeito,
    yPeito,
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
    : new THREE.Vector3(xPeito, yPeito, box.min.z);
  const pontoLocal = mesh.worldToLocal(pontoMundo.clone());

  const lado = size.x * LARGURA_ESCUDO;
  const profundidade = Math.min(size.z * 0.18, lado * 0.7);

  return {
    position: [pontoLocal.x, pontoLocal.y, pontoLocal.z],
    rotation: orientacaoLocalEscudo(mesh, pontoMundo),
    scale: [lado, lado, profundidade],
  };
};

const EscudoNoPeito = ({ url, meshRef }) => {
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
    setParams(calcularEscudoFrontal(mesh));
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
        polygonOffsetFactor={-8}
        toneMapped={false}
      />
    </Decal>
  );
};

const useEscudo = () => {
  const [urlEscudo, setUrlEscudo] = useState(null);
  const inputEscudoRef = useRef(null);

  useEffect(() => {
    return () => {
      if (urlEscudo) URL.revokeObjectURL(urlEscudo);
    };
  }, [urlEscudo]);

  const aoEscolherEscudo = (evento) => {
    const arquivo = evento.target.files?.[0];
    const ehImagem =
      arquivo &&
      (arquivo.type.startsWith("image/") ||
        /\.(png|jpe?g|webp)$/i.test(arquivo.name));
    if (!ehImagem) return;

    setUrlEscudo(URL.createObjectURL(arquivo));
  };

  const removerEscudo = () => {
    setUrlEscudo(null);
    if (inputEscudoRef.current) inputEscudoRef.current.value = "";
  };

  return { urlEscudo, inputEscudoRef, aoEscolherEscudo, removerEscudo };
};

const ControleEscudo = ({
  urlEscudo,
  inputEscudoRef,
  aoEscolherEscudo,
  removerEscudo,
}) => (
  <div className="visualizador-3d__escudo">
    <label className="visualizador-3d__escudo-botao">
      {urlEscudo ? "Trocar escudo" : "Inserir escudo no peito"}
      <input
        ref={inputEscudoRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={aoEscolherEscudo}
      />
    </label>
    {urlEscudo ? (
      <>
        <img
          className="visualizador-3d__escudo-preview"
          src={urlEscudo}
          alt="Escudo selecionado"
        />
        <button
          type="button"
          className="visualizador-3d__escudo-remover"
          onClick={removerEscudo}
        >
          Remover
        </button>
      </>
    ) : null}
  </div>
);

const EscudoNoModelo = ({ url, meshRef }) => {
  if (!url) return null;

  return (
    <Suspense fallback={null}>
      <EscudoNoPeito url={url} meshRef={meshRef} />
    </Suspense>
  );
};

export {
  calcularEscudoFrontal,
  ControleEscudo,
  EscudoNoModelo,
  EscudoNoPeito,
  orientacaoLocalEscudo,
  useEscudo,
};
