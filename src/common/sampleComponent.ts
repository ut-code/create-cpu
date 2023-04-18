import type { CCComponentDefinition } from "../types";

export const sampleComponent: CCComponentDefinition = {
  id: "Half Adder",
  name: "Half Adder",
  description: "",
  inputEdges: [
    {
      id: "Input1",
      name: "Input1",
      position: null,
    },
    {
      id: "Input2",
      name: "Input2",
      position: null,
    },
    {
      id: "CarryIn",
      name: "CarryIn",
      position: null,
    },
  ],
  outputEdges: [
    {
      id: "Sum",
      name: "Sum",
      position: null,
    },
    {
      id: "CarryOut",
      name: "CarryOut",
      position: null,
    },
  ],
  connections: [],
  children: [],
};
