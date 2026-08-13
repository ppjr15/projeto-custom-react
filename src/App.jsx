import { Layout } from "antd";
import "./App.css";
import { Content, Footer } from "antd/es/layout/layout";
import HeaderComponente from "./componentes/padrao/header";
import ComponenteRotas from "./componentes/rotas";
import { RotasAutenticadas } from "./componentes/rotas/componentes/rotasAutenticadas.jsx";

const contentStyle = {
  textAlign: "center",
  display: "flex",
  height: "100%",
  color: "#fff",
  backgroundColor: "#0958d9",

  padding: "10px 48px",
};
const footerStyle = {
  textAlign: "center",
  color: "#fff",
  backgroundColor: "#4096ff",
};
const layoutStyle = {
  overflow: "hidden",
};

function App() {
  return (
    <Layout style={layoutStyle}>
      <HeaderComponente />
      <Content style={contentStyle}>
        <ComponenteRotas rotas={RotasAutenticadas} />
      </Content>
      <Footer style={footerStyle}>Footer</Footer>
    </Layout>
  );
}

export default App;
