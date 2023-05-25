import type { CCComponent, CCNode } from "../types";

export const sampleHalfAdder: CCComponent = {
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

export const sampleHalfAdderNode: CCNode = {
  id: "Half Adder1",
  componentId: "Half Adder",
  position: {
    x: 0,
    y: 0,
  },
};
