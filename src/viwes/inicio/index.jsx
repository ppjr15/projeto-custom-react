import ComponenteCarrossel from "../../componentes/padrao/carrossel";

const Inicio = () => {
  const baseItems = Array.from({ length: 11 })?.map((_, index) => ({
    index: index,
    nme_card: `Card ${index}`,
  }));

  return (
    <div style={{ backgroundColor: "green", width: "100%" }}>
      <ComponenteCarrossel baseItems={baseItems} />
    </div>
  );
};

export default Inicio;
