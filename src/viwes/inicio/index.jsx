import ComponenteCarrossel from "../../componentes/padrao/carrossel";
import ComponenteVisualidor3D from "../../componentes/padrao/visualizador3D";

const Inicio = () => {
  const baseItems = Array.from({ length: 11 })?.map((_, index) => ({
    index: index,
    nme_card: `Card ${index}`,
  }));

  return (
    <div style={{ backgroundColor: "green", width: "100%" }}>
      <ComponenteCarrossel baseItems={baseItems} />
      <div style={{ backgroundColor: "yellow", height: "90vh" }}>
        <ComponenteVisualidor3D />
      </div>
    </div>
  );
};

export default Inicio;
