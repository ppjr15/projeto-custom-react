import { useState } from "react";
import ComponenteCarrossel from "../../componentes/padrao/carrossel";
import ComponenteVisualidor3D from "../../componentes/padrao/visualizador3D";
import {
  CAMISA,
  DEADPOOL,
} from "../../componentes/padrao/visualizador3D/components/objetos";

const Inicio = () => {
  const baseItems = Array.from({ length: 11 })?.map((_, index) => ({
    index: index,
    nme_card: `Card ${index}`,
  }));

  const [item, setItem] = useState(CAMISA);

  return (
    <div style={{ backgroundColor: "green", width: "100%" }}>
      <ComponenteCarrossel baseItems={baseItems} />
      <div style={{ backgroundColor: "yellow", height: "90vh", color: "red" }}>
        <ComponenteVisualidor3D objeto={item} />
        <div onClick={() => setItem(CAMISA)}>CAMISA</div>
        <div onClick={() => setItem(DEADPOOL)}>DEADPOOL</div>
      </div>
    </div>
  );
};

export default Inicio;
