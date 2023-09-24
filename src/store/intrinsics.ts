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

export function registerIntrinsics(store: CCStore) {
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
}
