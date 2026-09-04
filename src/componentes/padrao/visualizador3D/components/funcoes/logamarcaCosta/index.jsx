import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Decal, useTexture } from "@react-three/drei";
import * as THREE from "three";

import "./index.scss";

/** Linha dos ombros (0 = chão, 1 = topo). */
const ALTURA_OMBROS = 0.86;

/** Um pouco abaixo da barriga da frente (barriga ≈ 0.52). */
const ALTURA_INFERIOR = 0.22;

const LARGURA_SUPERIOR = 0.18;
const LARGURA_INFERIOR = 0.24;

const aplicarLado = (material, lado) => {
  if (Array.isArray(material)) material.forEach((m) => (m.side = lado));
  else if (material) material.side = lado;
};

/**
 * Orientação nas costas: vira para +Z (lado oposto à câmera frontal),
 * com o eixo Y do mundo para cima.
 */
const orientacaoLocalCosta = (mesh, pontoMundo) => {
  const dummy = new THREE.Object3D();
  dummy.position.copy(pontoMundo);
  dummy.up.set(0, 1, 0);
  dummy.lookAt(pontoMundo.x, pontoMundo.y, pontoMundo.z + 1);
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
 * Ponto nas costas, no centro: raio vindo de trás (+Z) para −Z.
 */
const calcularLogomarcaCosta = (mesh, alturaRelativa, larguraRelativa) => {
  mesh.updateWorldMatrix(true, false);

  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  if (size.lengthSq() === 0) return null;

  const yPos = box.min.y + size.y * alturaRelativa;
  const xCentro = center.x;
  const origem = new THREE.Vector3(
    xCentro,
    yPos,
    box.max.z + Math.max(size.z, 0.001),
  );
  const direcao = new THREE.Vector3(0, 0, -1);

  const ladoAnterior = Array.isArray(mesh.material)
    ? mesh.material[0]?.side
    : mesh.material?.side;
  aplicarLado(mesh.material, THREE.DoubleSide);

  const raycaster = new THREE.Raycaster(origem, direcao, 0, size.z * 4);
  const hit = raycaster.intersectObject(mesh, false)[0];

  aplicarLado(mesh.material, ladoAnterior);

  const pontoMundo = hit
    ? hit.point
    : new THREE.Vector3(xCentro, yPos, box.max.z);
  const pontoLocal = mesh.worldToLocal(pontoMundo.clone());

  const lado = size.x * larguraRelativa;
  const profundidade = Math.min(size.z * 0.18, lado * 0.7);

  return {
    position: [pontoLocal.x, pontoLocal.y, pontoLocal.z],
    rotation: orientacaoLocalCosta(mesh, pontoMundo),
    scale: [lado, lado, profundidade],
  };
};

const LogomarcaNaCosta = ({ url, meshRef, altura, largura }) => {
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
    setParams(calcularLogomarcaCosta(mesh, altura, largura));
    invalidate();
  }, [meshRef, mapa, invalidate, altura, largura]);

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

const useImagemEstampa = () => {
  const [url, setUrl] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const aoEscolher = (evento) => {
    const arquivo = evento.target.files?.[0];
    const ehImagem =
      arquivo &&
      (arquivo.type.startsWith("image/") ||
        /\.(png|jpe?g|webp)$/i.test(arquivo.name));
    if (!ehImagem) return;

    setUrl(URL.createObjectURL(arquivo));
  };

  const remover = () => {
    setUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return { url, inputRef, aoEscolher, remover };
};

const useLogomarcaCosta = () => {
  const superior = useImagemEstampa();
  const inferior = useImagemEstampa();
  return { superior, inferior };
};

const ControleUmaLogomarcaCosta = ({
  rotuloInserir,
  rotuloTrocar,
  url,
  inputRef,
  aoEscolher,
  remover,
}) => (
  <div className="visualizador-3d__logomarca-costa">
    <label className="visualizador-3d__logomarca-costa-botao">
      {url ? rotuloTrocar : rotuloInserir}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={aoEscolher}
      />
    </label>
    {url ? (
      <>
        <img
          className="visualizador-3d__logomarca-costa-preview"
          src={url}
          alt={rotuloInserir}
        />
        <button
          type="button"
          className="visualizador-3d__logomarca-costa-remover"
          onClick={remover}
        >
          Remover
        </button>
      </>
    ) : null}
  </div>
);

const ControleLogomarcaCosta = ({ superior, inferior }) => (
  <>
    <ControleUmaLogomarcaCosta
      rotuloInserir="Logomarca costas (ombros)"
      rotuloTrocar="Trocar costas (ombros)"
      url={superior.url}
      inputRef={superior.inputRef}
      aoEscolher={superior.aoEscolher}
      remover={superior.remover}
    />
    <ControleUmaLogomarcaCosta
      rotuloInserir="Logomarca costas (inferior)"
      rotuloTrocar="Trocar costas (inferior)"
      url={inferior.url}
      inputRef={inferior.inputRef}
      aoEscolher={inferior.aoEscolher}
      remover={inferior.remover}
    />
  </>
);

const LogomarcaCostaNoModelo = ({ urlSuperior, urlInferior, meshRef }) => (
  <>
    {urlSuperior ? (
      <Suspense fallback={null}>
        <LogomarcaNaCosta
          url={urlSuperior}
          meshRef={meshRef}
          altura={ALTURA_OMBROS}
          largura={LARGURA_SUPERIOR}
        />
      </Suspense>
    ) : null}
    {urlInferior ? (
      <Suspense fallback={null}>
        <LogomarcaNaCosta
          url={urlInferior}
          meshRef={meshRef}
          altura={ALTURA_INFERIOR}
          largura={LARGURA_INFERIOR}
        />
      </Suspense>
    ) : null}
  </>
);

export {
  calcularLogomarcaCosta,
  ControleLogomarcaCosta,
  LogomarcaCostaNoModelo,
  LogomarcaNaCosta,
  orientacaoLocalCosta,
  useLogomarcaCosta,
};
