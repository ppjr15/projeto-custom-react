import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";

const ComponenteRotas = ({ rotas }) => {
  return (
    <Suspense fallback={null}>
      <Routes>
        {rotas?.map(({ path, component: Component }, index) => {
          return <Route key={index} path={path} element={<Component />} />;
        })}
      </Routes>
    </Suspense>
  );
};

export default ComponenteRotas;
