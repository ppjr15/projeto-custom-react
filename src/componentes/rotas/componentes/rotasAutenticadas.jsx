import { lazy } from "react";

export const RotasAutenticadas = [
  {
    titulo: "INÍCIO",
    path: "/",
    component: lazy(() => import("../../../viwes/inicio")),
  },
  {
    titulo: "SIMULADOR",
    path: "/simulador",
    component: lazy(() => import("../../../viwes/simulador")),
  },
];
