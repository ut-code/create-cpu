/* eslint-disable max-classes-per-file */
import type CCStore from ".";
import type { CCComponent, CCComponentId } from "./component";
import type { CCComponentPin, CCComponentPinId } from "./componentPin";

export const andIntrinsicComponent: CCComponent = {
  id: "ffffffff-0001-4000-8000-000000000000" as CCComponentId,
  isIntrinsic: true,
  name: "And",
};

export const andIntrinsicComponentInputPinA: CCComponentPin = {
  id: "ffffffff-0001-4000-8000-000000000001" as CCComponentPinId,
  componentId: andIntrinsicComponent.id,
  type: "input",
  name: "A",
  implementation: null,
  multiplexable: true,
  bits: 1,
};

export const andIntrinsicComponentInputPinB: CCComponentPin = {
  id: "ffffffff-0001-4000-8000-000000000002" as CCComponentPinId,
  componentId: andIntrinsicComponent.id,
  type: "input",
  name: "B",
  implementation: null,
  multiplexable: true,
  bits: 1,
};

export const andIntrinsicComponentOutputPin: CCComponentPin = {
  id: "ffffffff-0001-4000-8000-000000000003" as CCComponentPinId,
  componentId: andIntrinsicComponent.id,
  type: "output",
  name: "Out",
  implementation: null,
  multiplexable: true,
  bits: 1,
};

export const orIntrinsicComponent: CCComponent = {
  id: "ffffffff-0002-4000-8000-000000000000" as CCComponentId,
  isIntrinsic: true,
  name: "Or",
};

export const orIntrinsicComponentInputPinA: CCComponentPin = {
  id: "ffffffff-0002-4000-8000-000000000001" as CCComponentPinId,
  componentId: orIntrinsicComponent.id,
  type: "input",
  name: "A",
  implementation: null,
  multiplexable: true,
  bits: 1,
};

export const orIntrinsicComponentInputPinB: CCComponentPin = {
  id: "ffffffff-0002-4000-8000-000000000002" as CCComponentPinId,
  componentId: orIntrinsicComponent.id,
  type: "input",
  name: "B",
  implementation: null,
  multiplexable: true,
  bits: 1,
};

export const orIntrinsicComponentOutputPin: CCComponentPin = {
  id: "ffffffff-0002-4000-8000-000000000003" as CCComponentPinId,
  componentId: orIntrinsicComponent.id,
  type: "output",
  name: "Out",
  implementation: null,
  multiplexable: true,
  bits: 1,
};

export const notIntrinsicComponent: CCComponent = {
  id: "ffffffff-0003-4000-8000-000000000000" as CCComponentId,
  isIntrinsic: true,
  name: "Not",
};

export const notIntrinsicComponentInputPin: CCComponentPin = {
  id: "ffffffff-0003-4000-8000-000000000001" as CCComponentPinId,
  componentId: notIntrinsicComponent.id,
  type: "input",
  name: "In",
  implementation: null,
  multiplexable: true,
  bits: 1,
};

export const notIntrinsicComponentOutputPin: CCComponentPin = {
  id: "ffffffff-0003-4000-8000-000000000002" as CCComponentPinId,
  componentId: notIntrinsicComponent.id,
  type: "output",
  name: "Out",
  implementation: null,
  multiplexable: true,
  bits: 1,
};

export const xorIntrinsicComponent: CCComponent = {
  id: "ffffffff-0004-4000-8000-000000000000" as CCComponentId,
  isIntrinsic: true,
  name: "Xor",
};

export const xorIntrinsicComponentInputPinA: CCComponentPin = {
  id: "ffffffff-0004-4000-8000-000000000001" as CCComponentPinId,
  componentId: xorIntrinsicComponent.id,
  type: "input",
  name: "A",
  implementation: null,
  multiplexable: true,
  bits: 1,
};

export const xorIntrinsicComponentInputPinB: CCComponentPin = {
  id: "ffffffff-0004-4000-8000-000000000002" as CCComponentPinId,
  componentId: xorIntrinsicComponent.id,
  type: "input",
  name: "B",
  implementation: null,
  multiplexable: true,
  bits: 1,
};

export const xorIntrinsicComponentOutputPin: CCComponentPin = {
  id: "ffffffff-0004-4000-8000-000000000003" as CCComponentPinId,
  componentId: xorIntrinsicComponent.id,
  type: "output",
  name: "Out",
  implementation: null,
  multiplexable: true,
  bits: 1,
};

export const inputIntrinsicComponent: CCComponent = {
  id: "ffffffff-0005-4000-8000-000000000000" as CCComponentId,
  isIntrinsic: true,
  name: "Input",
};

export const inputIntrinsicComponentInputPin: CCComponentPin = {
  id: "ffffffff-0005-4000-8000-000000000001" as CCComponentPinId,
  componentId: inputIntrinsicComponent.id,
  type: "input",
  name: "In",
  implementation: null,
  multiplexable: true,
  bits: 1,
};

export const inputIntrinsicComponentOutputPin: CCComponentPin = {
  id: "ffffffff-0005-4000-8000-000000000002" as CCComponentPinId,
  componentId: inputIntrinsicComponent.id,
  type: "output",
  name: "Out",
  implementation: null,
  multiplexable: true,
  bits: 1,
};

export const fourBitsIntrinsicComponent: CCComponent = {
  id: "ffffffff-0006-4000-8000-000000000000" as CCComponentId,
  isIntrinsic: true,
  name: "FourBits",
};

export const fourBitsIntrinsicComponentInputPin0: CCComponentPin = {
  id: "ffffffff-0006-4000-8000-000000000001" as CCComponentPinId,
  componentId: fourBitsIntrinsicComponent.id,
  type: "input",
  name: "bit0",
  implementation: null,
  multiplexable: false,
  bits: 1,
};

export const fourBitsIntrinsicComponentInputPin1: CCComponentPin = {
  id: "ffffffff-0006-4000-8000-000000000002" as CCComponentPinId,
  componentId: fourBitsIntrinsicComponent.id,
  type: "input",
  name: "bit1",
  implementation: null,
  multiplexable: false,
  bits: 1,
};

export const fourBitsIntrinsicComponentInputPin2: CCComponentPin = {
  id: "ffffffff-0006-4000-8000-000000000003" as CCComponentPinId,
  componentId: fourBitsIntrinsicComponent.id,
  type: "input",
  name: "bit2",
  implementation: null,
  multiplexable: false,
  bits: 1,
};

export const fourBitsIntrinsicComponentInputPin3: CCComponentPin = {
  id: "ffffffff-0006-4000-8000-000000000004" as CCComponentPinId,
  componentId: fourBitsIntrinsicComponent.id,
  type: "input",
  name: "bit3",
  implementation: null,
  multiplexable: false,
  bits: 1,
};

export const fourBitsIntrinsicComponentOutputPin: CCComponentPin = {
  id: "ffffffff-0006-4000-8000-000000000005" as CCComponentPinId,
  componentId: fourBitsIntrinsicComponent.id,
  type: "output",
  name: "Out",
  implementation: null,
  multiplexable: false,
  bits: 4,
};

export const distributeFourBitsIntrinsicComponent: CCComponent = {
  id: "ffffffff-0007-4000-8000-000000000000" as CCComponentId,
  isIntrinsic: true,
  name: "DistributeFourBits",
};

export const distributeFourBitsIntrinsicComponentInputPin: CCComponentPin = {
  id: "ffffffff-0007-4000-8000-000000000001" as CCComponentPinId,
  componentId: distributeFourBitsIntrinsicComponent.id,
  type: "input",
  name: "input",
  implementation: null,
  multiplexable: false,
  bits: 4,
};

export const distributeFourBitsIntrinsicComponentOutputPin0: CCComponentPin = {
  id: "ffffffff-0007-4000-8000-000000000002" as CCComponentPinId,
  componentId: distributeFourBitsIntrinsicComponent.id,
  type: "output",
  name: "bit0",
  implementation: null,
  multiplexable: false,
  bits: 1,
};

export const distributeFourBitsIntrinsicComponentOutputPin1: CCComponentPin = {
  id: "ffffffff-0007-4000-8000-000000000003" as CCComponentPinId,
  componentId: distributeFourBitsIntrinsicComponent.id,
  type: "output",
  name: "bit1",
  implementation: null,
  multiplexable: false,
  bits: 1,
};

export const distributeFourBitsIntrinsicComponentOutputPin2: CCComponentPin = {
  id: "ffffffff-0007-4000-8000-000000000004" as CCComponentPinId,
  componentId: distributeFourBitsIntrinsicComponent.id,
  type: "output",
  name: "bit2",
  implementation: null,
  multiplexable: false,
  bits: 1,
};

export const distributeFourBitsIntrinsicComponentOutputPin3: CCComponentPin = {
  id: "ffffffff-0007-4000-8000-000000000005" as CCComponentPinId,
  componentId: distributeFourBitsIntrinsicComponent.id,
  type: "output",
  name: "bit3",
  implementation: null,
  multiplexable: false,
  bits: 1,
};

export const flipFlopIntrinsicComponent: CCComponent = {
  id: "ffffffff-0008-4000-8000-000000000000" as CCComponentId,
  isIntrinsic: true,
  name: "FlipFlop",
};

export const flipFlopIntrinsicComponentInputPin: CCComponentPin = {
  id: "ffffffff-0008-4000-8000-000000000001" as CCComponentPinId,
  componentId: flipFlopIntrinsicComponent.id,
  type: "input",
  name: "In",
  implementation: null,
  multiplexable: true,
  bits: 1,
};

export const flipFlopIntrinsicComponentOutputPin: CCComponentPin = {
  id: "ffffffff-0008-4000-8000-000000000002" as CCComponentPinId,
  componentId: flipFlopIntrinsicComponent.id,
  type: "output",
  name: "Out",
  implementation: null,
  multiplexable: true,
  bits: 1,
};

/**
 * Register intrinsic components to the store
 * @param store
 * @returns void
 */
export function registerIntrinsics(store: CCStore) {
  if (store.components.get(andIntrinsicComponent.id)) return;
  store.components.register(andIntrinsicComponent);
  store.componentPins.register(andIntrinsicComponentInputPinA);
  store.componentPins.register(andIntrinsicComponentInputPinB);
  store.componentPins.register(andIntrinsicComponentOutputPin);
  store.components.register(orIntrinsicComponent);
  store.componentPins.register(orIntrinsicComponentInputPinA);
  store.componentPins.register(orIntrinsicComponentInputPinB);
  store.componentPins.register(orIntrinsicComponentOutputPin);
  store.components.register(notIntrinsicComponent);
  store.componentPins.register(notIntrinsicComponentInputPin);
  store.componentPins.register(notIntrinsicComponentOutputPin);
  store.components.register(xorIntrinsicComponent);
  store.componentPins.register(xorIntrinsicComponentInputPinA);
  store.componentPins.register(xorIntrinsicComponentInputPinB);
  store.componentPins.register(xorIntrinsicComponentOutputPin);
  store.components.register(inputIntrinsicComponent);
  store.componentPins.register(inputIntrinsicComponentInputPin);
  store.componentPins.register(inputIntrinsicComponentOutputPin);
  store.components.register(fourBitsIntrinsicComponent);
  store.componentPins.register(fourBitsIntrinsicComponentInputPin0);
  store.componentPins.register(fourBitsIntrinsicComponentInputPin1);
  store.componentPins.register(fourBitsIntrinsicComponentInputPin2);
  store.componentPins.register(fourBitsIntrinsicComponentInputPin3);
  store.componentPins.register(fourBitsIntrinsicComponentOutputPin);
  store.components.register(distributeFourBitsIntrinsicComponent);
  store.componentPins.register(distributeFourBitsIntrinsicComponentInputPin);
  store.componentPins.register(distributeFourBitsIntrinsicComponentOutputPin0);
  store.componentPins.register(distributeFourBitsIntrinsicComponentOutputPin1);
  store.componentPins.register(distributeFourBitsIntrinsicComponentOutputPin2);
  store.componentPins.register(distributeFourBitsIntrinsicComponentOutputPin3);
  store.components.register(flipFlopIntrinsicComponent);
  store.componentPins.register(flipFlopIntrinsicComponentInputPin);
  store.componentPins.register(flipFlopIntrinsicComponentOutputPin);
}

/**
 * Check if the component has variable pin count
 * @param componentId id of component
 * @returns if the component has variable pin count, `true` returns (otherwise `false`)
 */
export function hasVariablePinCount(componentId: CCComponentId) {
  return (
    componentId === fourBitsIntrinsicComponent.id ||
    componentId === distributeFourBitsIntrinsicComponent.id
  );
}
