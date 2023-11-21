/* eslint-disable max-classes-per-file */
import type CCStore from ".";
import type { CCComponent, CCComponentId } from "./component";
import type { CCPin, CCPinId } from "./pin";

export const andIntrinsicComponent: CCComponent = {
  id: "ffffffff-0001-4000-8000-000000000000" as CCComponentId,
  isIntrinsic: true,
  name: "And",
};

export const andIntrinsicComponentInputPinA: CCPin = {
  id: "ffffffff-0001-4000-8000-000000000001" as CCPinId,
  componentId: andIntrinsicComponent.id,
  type: "input",
  name: "A",
  implementation: { type: "intrinsic" },
};

export const andIntrinsicComponentInputPinB: CCPin = {
  id: "ffffffff-0001-4000-8000-000000000002" as CCPinId,
  componentId: andIntrinsicComponent.id,
  type: "input",
  name: "B",
  implementation: { type: "intrinsic" },
};

export const andIntrinsicComponentOutputPin: CCPin = {
  id: "ffffffff-0001-4000-8000-000000000003" as CCPinId,
  componentId: andIntrinsicComponent.id,
  type: "output",
  name: "Out",
  implementation: { type: "intrinsic" },
};

export const orIntrinsicComponent: CCComponent = {
  id: "ffffffff-0002-4000-8000-000000000000" as CCComponentId,
  isIntrinsic: true,
  name: "Or",
};

export const orIntrinsicComponentInputPinA: CCPin = {
  id: "ffffffff-0002-4000-8000-000000000001" as CCPinId,
  componentId: orIntrinsicComponent.id,
  type: "input",
  name: "A",
  implementation: { type: "intrinsic" },
};

export const orIntrinsicComponentInputPinB: CCPin = {
  id: "ffffffff-0002-4000-8000-000000000002" as CCPinId,
  componentId: orIntrinsicComponent.id,
  type: "input",
  name: "B",
  implementation: { type: "intrinsic" },
};

export const orIntrinsicComponentOutputPin: CCPin = {
  id: "ffffffff-0002-4000-8000-000000000003" as CCPinId,
  componentId: orIntrinsicComponent.id,
  type: "output",
  name: "Out",
  implementation: { type: "intrinsic" },
};

export const notIntrinsicComponent: CCComponent = {
  id: "ffffffff-0003-4000-8000-000000000000" as CCComponentId,
  isIntrinsic: true,
  name: "Not",
};

export const notIntrinsicComponentInputPin: CCPin = {
  id: "ffffffff-0003-4000-8000-000000000001" as CCPinId,
  componentId: notIntrinsicComponent.id,
  type: "input",
  name: "In",
  implementation: { type: "intrinsic" },
};

export const notIntrinsicComponentOutputPin: CCPin = {
  id: "ffffffff-0003-4000-8000-000000000002" as CCPinId,
  componentId: notIntrinsicComponent.id,
  type: "output",
  name: "Out",
  implementation: { type: "intrinsic" },
};

export const xorIntrinsicComponent: CCComponent = {
  id: "ffffffff-0004-4000-8000-000000000000" as CCComponentId,
  isIntrinsic: true,
  name: "Xor",
};

export const xorIntrinsicComponentInputPinA: CCPin = {
  id: "ffffffff-0004-4000-8000-000000000001" as CCPinId,
  componentId: xorIntrinsicComponent.id,
  type: "input",
  name: "A",
  implementation: { type: "intrinsic" },
};

export const xorIntrinsicComponentInputPinB: CCPin = {
  id: "ffffffff-0004-4000-8000-000000000002" as CCPinId,
  componentId: xorIntrinsicComponent.id,
  type: "input",
  name: "B",
  implementation: { type: "intrinsic" },
};

export const xorIntrinsicComponentOutputPin: CCPin = {
  id: "ffffffff-0004-4000-8000-000000000003" as CCPinId,
  componentId: xorIntrinsicComponent.id,
  type: "output",
  name: "Out",
  implementation: { type: "intrinsic" },
};

export const inputIntrinsicComponent: CCComponent = {
  id: "ffffffff-0005-4000-8000-000000000000" as CCComponentId,
  isIntrinsic: true,
  name: "Input",
};

export const inputIntrinsicComponentInputPin: CCPin = {
  id: "ffffffff-0005-4000-8000-000000000001" as CCPinId,
  componentId: inputIntrinsicComponent.id,
  type: "input",
  name: "In",
  implementation: { type: "intrinsic" },
};

export const inputIntrinsicComponentOutputPin: CCPin = {
  id: "ffffffff-0005-4000-8000-000000000002" as CCPinId,
  componentId: inputIntrinsicComponent.id,
  type: "output",
  name: "Out",
  implementation: { type: "intrinsic" },
};

export const fourBitsIntrinsicComponent: CCComponent = {
  id: "ffffffff-0006-4000-8000-000000000000" as CCComponentId,
  isIntrinsic: true,
  name: "FourBits",
};

export const fourBitsIntrinsicComponentInputPin0: CCPin = {
  id: "ffffffff-0006-4000-8000-000000000001" as CCPinId,
  componentId: fourBitsIntrinsicComponent.id,
  type: "input",
  name: "bit0",
  implementation: { type: "intrinsic" },
};

export const fourBitsIntrinsicComponentInputPin1: CCPin = {
  id: "ffffffff-0006-4000-8000-000000000002" as CCPinId,
  componentId: fourBitsIntrinsicComponent.id,
  type: "input",
  name: "bit1",
  implementation: { type: "intrinsic" },
};

export const fourBitsIntrinsicComponentInputPin2: CCPin = {
  id: "ffffffff-0006-4000-8000-000000000003" as CCPinId,
  componentId: fourBitsIntrinsicComponent.id,
  type: "input",
  name: "bit2",
  implementation: { type: "intrinsic" },
};

export const fourBitsIntrinsicComponentInputPin3: CCPin = {
  id: "ffffffff-0006-4000-8000-000000000004" as CCPinId,
  componentId: fourBitsIntrinsicComponent.id,
  type: "input",
  name: "bit3",
  implementation: { type: "intrinsic" },
};

export const fourBitsIntrinsicComponentOutputPin: CCPin = {
  id: "ffffffff-0006-4000-8000-000000000005" as CCPinId,
  componentId: fourBitsIntrinsicComponent.id,
  type: "output",
  name: "Out",
  implementation: { type: "intrinsic" },
};

export const distiributeFourBitsIntrinsicComponent: CCComponent = {
  id: "ffffffff-0007-4000-8000-000000000000" as CCComponentId,
  isIntrinsic: true,
  name: "DistributeFourBits",
};

export const distiributeFourBitsIntrinsicComponentInputPin: CCPin = {
  id: "ffffffff-0007-4000-8000-000000000001" as CCPinId,
  componentId: distiributeFourBitsIntrinsicComponent.id,
  type: "input",
  name: "input",
  implementation: { type: "intrinsic" },
};

export const distiributeFourBitsIntrinsicComponentOutputPin0: CCPin = {
  id: "ffffffff-0007-4000-8000-000000000002" as CCPinId,
  componentId: distiributeFourBitsIntrinsicComponent.id,
  type: "output",
  name: "bit0",
  implementation: { type: "intrinsic" },
};

export const distiributeFourBitsIntrinsicComponentOutputPin1: CCPin = {
  id: "ffffffff-0007-4000-8000-000000000003" as CCPinId,
  componentId: distiributeFourBitsIntrinsicComponent.id,
  type: "output",
  name: "bit1",
  implementation: { type: "intrinsic" },
};

export const distiributeFourBitsIntrinsicComponentOutputPin2: CCPin = {
  id: "ffffffff-0007-4000-8000-000000000004" as CCPinId,
  componentId: distiributeFourBitsIntrinsicComponent.id,
  type: "output",
  name: "bit2",
  implementation: { type: "intrinsic" },
};

export const distiributeFourBitsIntrinsicComponentOutputPin3: CCPin = {
  id: "ffffffff-0007-4000-8000-000000000005" as CCPinId,
  componentId: distiributeFourBitsIntrinsicComponent.id,
  type: "output",
  name: "bit3",
  implementation: { type: "intrinsic" },
};

export function registerIntrinsics(store: CCStore) {
  if (store.components.get(andIntrinsicComponent.id)) return;
  store.components.register(andIntrinsicComponent);
  store.pins.register(andIntrinsicComponentInputPinA);
  store.pins.register(andIntrinsicComponentInputPinB);
  store.pins.register(andIntrinsicComponentOutputPin);
  store.components.register(orIntrinsicComponent);
  store.pins.register(orIntrinsicComponentInputPinA);
  store.pins.register(orIntrinsicComponentInputPinB);
  store.pins.register(orIntrinsicComponentOutputPin);
  store.components.register(notIntrinsicComponent);
  store.pins.register(notIntrinsicComponentInputPin);
  store.pins.register(notIntrinsicComponentOutputPin);
  store.components.register(xorIntrinsicComponent);
  store.pins.register(xorIntrinsicComponentInputPinA);
  store.pins.register(xorIntrinsicComponentInputPinB);
  store.pins.register(xorIntrinsicComponentOutputPin);
  store.components.register(inputIntrinsicComponent);
  store.pins.register(inputIntrinsicComponentInputPin);
  store.pins.register(inputIntrinsicComponentOutputPin);
  store.components.register(fourBitsIntrinsicComponent);
  store.pins.register(fourBitsIntrinsicComponentInputPin0);
  store.pins.register(fourBitsIntrinsicComponentInputPin1);
  store.pins.register(fourBitsIntrinsicComponentInputPin2);
  store.pins.register(fourBitsIntrinsicComponentInputPin3);
  store.pins.register(fourBitsIntrinsicComponentOutputPin);
  store.components.register(distiributeFourBitsIntrinsicComponent);
  store.pins.register(distiributeFourBitsIntrinsicComponentInputPin);
  store.pins.register(distiributeFourBitsIntrinsicComponentOutputPin0);
  store.pins.register(distiributeFourBitsIntrinsicComponentOutputPin1);
  store.pins.register(distiributeFourBitsIntrinsicComponentOutputPin2);
  store.pins.register(distiributeFourBitsIntrinsicComponentOutputPin3);
}
