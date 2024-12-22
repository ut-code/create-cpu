/* eslint-disable max-classes-per-file */
import type CCStore from ".";
import type { CCComponent, CCComponentId } from "./component";
import type { CCComponentPin, CCComponentPinId } from "./componentPin";

export const ccIntrinsicComponentTypes = {
  AND: "AND",
  OR: "OR",
  NOT: "NOT",
  XOR: "XOR",
  INPUT: "INPUT",
  AGGREGATE: "AGGREGATE",
  BROADCAST: "BROADCAST",
  DECOMPOSE: "DECOMPOSE",
  FLIPFLOP: "FLIPFLOP",
} as const;
export type CCIntrinsicComponentType = keyof typeof ccIntrinsicComponentTypes;

export interface CCIntrinsicComponentDefinition {
  type: CCIntrinsicComponentType;
  component: CCComponent;
  inputPins: CCComponentPin[];
  outputPins: CCComponentPin[];
  componentPinCanHaveMultipleNodePins?: (pin: CCComponentPin) => boolean;
  componentPinHasUserSpecifiedBitWidth?: (pin: CCComponentPin) => boolean;
}

const andComponentId = "ffffffff-0001-4000-8000-000000000000" as CCComponentId;
const andInputPinAId =
  "ffffffff-0001-4000-8000-000000000001" as CCComponentPinId;
const andInputPinBId =
  "ffffffff-0001-4000-8000-000000000002" as CCComponentPinId;
const andOutputPinId =
  "ffffffff-0001-4000-8000-000000000003" as CCComponentPinId;
export const andIntrinsicComponentDefinition: CCIntrinsicComponentDefinition = {
  type: ccIntrinsicComponentTypes.AND,
  component: {
    id: andComponentId,
    intrinsicType: ccIntrinsicComponentTypes.AND,
    name: "And",
  },
  inputPins: [
    {
      id: andInputPinAId,
      componentId: andComponentId,
      type: "input",
      implementation: null,
      order: 0,
      name: "A",
    },
    {
      id: andInputPinBId,
      componentId: andComponentId,
      type: "input",
      implementation: null,
      order: 1,
      name: "B",
    },
  ],
  outputPins: [
    {
      id: andOutputPinId,
      componentId: andComponentId,
      type: "output",
      implementation: null,
      order: 0,
      name: "Out",
    },
  ],
};

const orComponentId = "ffffffff-0002-4000-8000-000000000000" as CCComponentId;
const orInputPinAId =
  "ffffffff-0002-4000-8000-000000000001" as CCComponentPinId;
const orInputPinBId =
  "ffffffff-0002-4000-8000-000000000002" as CCComponentPinId;
const orOutputPinId =
  "ffffffff-0002-4000-8000-000000000003" as CCComponentPinId;
export const orIntrinsicComponentDefinition: CCIntrinsicComponentDefinition = {
  type: "OR",
  component: {
    id: orComponentId,
    intrinsicType: ccIntrinsicComponentTypes.OR,
    name: "Or",
  },
  inputPins: [
    {
      id: orInputPinAId,
      componentId: orComponentId,
      type: "input",
      implementation: null,
      order: 0,
      name: "A",
    },
    {
      id: orInputPinBId,
      componentId: orComponentId,
      type: "input",
      implementation: null,
      order: 1,
      name: "B",
    },
  ],
  outputPins: [
    {
      id: orOutputPinId,
      componentId: orComponentId,
      type: "output",
      implementation: null,
      order: 0,
      name: "Out",
    },
  ],
};

const notComponentId = "ffffffff-0003-4000-8000-000000000000" as CCComponentId;
const notInputPinId =
  "ffffffff-0003-4000-8000-000000000001" as CCComponentPinId;
const notOutputPinId =
  "ffffffff-0003-4000-8000-000000000002" as CCComponentPinId;
export const notIntrinsicComponentDefinition: CCIntrinsicComponentDefinition = {
  type: "NOT",
  component: {
    id: notComponentId,
    intrinsicType: ccIntrinsicComponentTypes.NOT,
    name: "Not",
  },
  inputPins: [
    {
      id: notInputPinId,
      componentId: notComponentId,
      type: "input",
      implementation: null,
      order: 0,
      name: "In",
    },
  ],
  outputPins: [
    {
      id: notOutputPinId,
      componentId: notComponentId,
      type: "output",
      implementation: null,
      order: 0,
      name: "Out",
    },
  ],
};

const xorComponentId = "ffffffff-0004-4000-8000-000000000000" as CCComponentId;
const xorInputPinAId =
  "ffffffff-0004-4000-8000-000000000001" as CCComponentPinId;
const xorInputPinBId =
  "ffffffff-0004-4000-8000-000000000002" as CCComponentPinId;
const xorOutputPinId =
  "ffffffff-0004-4000-8000-000000000003" as CCComponentPinId;
export const xorIntrinsicComponentDefinition: CCIntrinsicComponentDefinition = {
  type: "XOR",
  component: {
    id: xorComponentId,
    intrinsicType: ccIntrinsicComponentTypes.XOR,
    name: "Xor",
  },
  inputPins: [
    {
      id: xorInputPinAId,
      componentId: xorComponentId,
      type: "input",
      implementation: null,
      order: 0,
      name: "A",
    },
    {
      id: xorInputPinBId,
      componentId: xorComponentId,
      type: "input",
      implementation: null,
      order: 1,
      name: "B",
    },
  ],
  outputPins: [
    {
      id: xorOutputPinId,
      componentId: xorComponentId,
      type: "output",
      implementation: null,
      order: 0,
      name: "Out",
    },
  ],
};

const inputComponentId =
  "ffffffff-0005-4000-8000-000000000000" as CCComponentId;
const inputInputPinId =
  "ffffffff-0005-4000-8000-000000000001" as CCComponentPinId;
const inputOutputPinId =
  "ffffffff-0005-4000-8000-000000000002" as CCComponentPinId;
export const inputIntrinsicComponentDefinition: CCIntrinsicComponentDefinition =
  {
    type: "INPUT",
    component: {
      id: inputComponentId,
      intrinsicType: ccIntrinsicComponentTypes.INPUT,
      name: "Input",
    },
    inputPins: [
      {
        id: inputInputPinId,
        componentId: inputComponentId,
        type: "input",
        implementation: null,
        order: 0,
        name: "In",
      },
    ],
    outputPins: [
      {
        id: inputOutputPinId,
        componentId: inputComponentId,
        type: "output",
        implementation: null,
        order: 0,
        name: "Out",
      },
    ],
  };

const aggregateComponentId =
  "ffffffff-0006-4000-8000-000000000000" as CCComponentId;
const aggregateInputPinId =
  "ffffffff-0006-4000-8000-000000000001" as CCComponentPinId;
const aggregateOutputPinId =
  "ffffffff-0006-4000-8000-000000000002" as CCComponentPinId;
export const aggregateIntrinsicComponentDefinition: CCIntrinsicComponentDefinition =
  {
    type: "AGGREGATE",
    component: {
      id: aggregateComponentId,
      intrinsicType: ccIntrinsicComponentTypes.AGGREGATE,
      name: "Aggregate",
    },
    inputPins: [
      {
        id: aggregateInputPinId,
        componentId: aggregateComponentId,
        type: "input",
        implementation: null,
        order: 0,
        name: "In",
      },
    ],
    outputPins: [
      {
        id: aggregateOutputPinId,
        componentId: aggregateComponentId,
        type: "output",
        implementation: null,
        order: 0,
        name: "Out",
      },
    ],
    componentPinCanHaveMultipleNodePins: (pin) => pin.type === "input",
    componentPinHasUserSpecifiedBitWidth: (pin) => pin.type === "input",
  };

const broadcastComponentId =
  "ffffffff-0007-4000-8000-000000000000" as CCComponentId;
const broadcastInputPinId =
  "ffffffff-0007-4000-8000-000000000001" as CCComponentPinId;
const broadcastOutputPinId =
  "ffffffff-0007-4000-8000-000000000002" as CCComponentPinId;
export const broadcastIntrinsicComponentDefinition: CCIntrinsicComponentDefinition =
  {
    type: "BROADCAST",
    component: {
      id: broadcastComponentId,
      intrinsicType: ccIntrinsicComponentTypes.BROADCAST,
      name: "Broadcast",
    },
    inputPins: [
      {
        id: broadcastInputPinId,
        componentId: broadcastComponentId,
        type: "input",
        implementation: null,
        order: 0,
        name: "In",
      },
    ],
    outputPins: [
      {
        id: broadcastOutputPinId,
        componentId: broadcastComponentId,
        type: "output",
        implementation: null,
        order: 0,
        name: "Out",
      },
    ],
    componentPinHasUserSpecifiedBitWidth: (pin) => pin.type === "output",
  };

const decomposeComponentId =
  "ffffffff-0008-4000-8000-000000000000" as CCComponentId;
const decomposeInputPinId =
  "ffffffff-0008-4000-8000-000000000001" as CCComponentPinId;
const decomposeOutputPinId =
  "ffffffff-0008-4000-8000-000000000002" as CCComponentPinId;
export const decomposeIntrinsicComponentDefinition: CCIntrinsicComponentDefinition =
  {
    type: "DECOMPOSE",
    component: {
      id: decomposeComponentId,
      intrinsicType: ccIntrinsicComponentTypes.DECOMPOSE,
      name: "Decompose",
    },
    inputPins: [
      {
        id: decomposeInputPinId,
        componentId: decomposeComponentId,
        type: "input",
        implementation: null,
        order: 0,
        name: "In",
      },
    ],
    outputPins: [
      {
        id: decomposeOutputPinId,
        componentId: decomposeComponentId,
        type: "output",
        implementation: null,
        order: 0,
        name: "Out",
      },
    ],
    componentPinCanHaveMultipleNodePins: (pin) => pin.type === "output",
    componentPinHasUserSpecifiedBitWidth: (pin) => pin.type === "output",
  };

export const flipFlopIntrinsicComponentId =
  "ffffffff-0009-4000-8000-000000000000" as CCComponentId;
export const flipFlopIntrinsicComponentInputPinId =
  "ffffffff-0009-4000-8000-000000000001" as CCComponentPinId;
export const flipFlopIntrinsicComponentOutputPinId =
  "ffffffff-0009-4000-8000-000000000002" as CCComponentPinId;
export const flipFlopIntrinsicComponentDefinition: CCIntrinsicComponentDefinition =
  {
    type: "FLIPFLOP",
    component: {
      id: flipFlopIntrinsicComponentId,
      intrinsicType: ccIntrinsicComponentTypes.FLIPFLOP,
      name: "FlipFlop",
    },
    inputPins: [
      {
        id: flipFlopIntrinsicComponentInputPinId,
        componentId: flipFlopIntrinsicComponentId,
        type: "input",
        implementation: null,
        order: 0,
        name: "In",
      },
    ],
    outputPins: [
      {
        id: flipFlopIntrinsicComponentOutputPinId,
        componentId: flipFlopIntrinsicComponentId,
        type: "output",
        implementation: null,
        order: 0,
        name: "Out",
      },
    ],
  };

export const ccIntrinsicComponentDefinitions: Record<
  CCIntrinsicComponentType,
  CCIntrinsicComponentDefinition
> = {
  [ccIntrinsicComponentTypes.AND]: andIntrinsicComponentDefinition,
  [ccIntrinsicComponentTypes.OR]: orIntrinsicComponentDefinition,
  [ccIntrinsicComponentTypes.NOT]: notIntrinsicComponentDefinition,
  [ccIntrinsicComponentTypes.XOR]: xorIntrinsicComponentDefinition,
  [ccIntrinsicComponentTypes.INPUT]: inputIntrinsicComponentDefinition,
  [ccIntrinsicComponentTypes.AGGREGATE]: aggregateIntrinsicComponentDefinition,
  [ccIntrinsicComponentTypes.BROADCAST]: broadcastIntrinsicComponentDefinition,
  [ccIntrinsicComponentTypes.DECOMPOSE]: decomposeIntrinsicComponentDefinition,
  [ccIntrinsicComponentTypes.FLIPFLOP]: flipFlopIntrinsicComponentDefinition,
};

/**
 * Register intrinsic components to the store
 * @param store
 * @returns void
 */
export function registerIntrinsics(store: CCStore) {
  Object.values(ccIntrinsicComponentDefinitions).forEach((definition) => {
    store.components.register(definition.component);
    definition.inputPins.forEach((pin) => store.componentPins.register(pin));
    definition.outputPins.forEach((pin) => store.componentPins.register(pin));
  });
}
