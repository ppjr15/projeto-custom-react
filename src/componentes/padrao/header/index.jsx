import { Header } from "antd/es/layout/layout";
import { Link } from "react-router-dom";

const headerStyle = {
  textAlign: "center",
  color: "#fff",
  height: 64,
  paddingInline: 48,
  lineHeight: "64px",
  backgroundColor: "#4096ff",

  gap: "20px",
  display: "flex",
  flexDirection: "row",
};

const HeaderComponente = ({ cacete }) => {
  console.log(cacete);

  return (
    <Header style={headerStyle}>
      <div style={{ backgroundColor: "red", width: "200px" }}>logo</div>

      <div style={{ backgroundColor: "green", width: "100%" }}>
        <Link to={"/"}>Inicio</Link>
        <Link to={"/simulador"}>Simulador</Link>
      </div>
    </Header>
  );
};

export default HeaderComponente;
