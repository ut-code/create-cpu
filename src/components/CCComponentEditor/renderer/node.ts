// import type { Point } from "pixi.js";
import * as PIXI from "pixi.js";
import type { Point } from "pixi.js";
import { blackColor, primaryColor, whiteColor } from "../../../common/theme";
import type { CCNodeId } from "../../../store/node";
import { type CCPinId } from "../../../store/pin";
import type CCStore from "../../../store";
import CCComponentEditorRendererPin from "./pin";
import type { ComponentEditorStore } from "../store";
import CCComponentEditorRendererInput from "./input";

export type CCComponentEditorRendererNodeProps = {
  store: CCStore;
  componentEditorStore: ComponentEditorStore;
  nodeId: CCNodeId;
  pixiParentContainer: PIXI.Container;
  onDragStart(e: PIXI.FederatedMouseEvent): void;
  onDragStartPin(e: PIXI.FederatedMouseEvent, pinId: CCPinId): void;
  onDragEndPin(e: PIXI.FederatedMouseEvent, pinId: CCPinId): void;
};

type PixiTexts = {
  componentName: PIXI.Text;
  pinNames: Map<string, PIXI.Text>;
};

const getSize = (inputPinCount: number, outputPinCount: number) =>
  new PIXI.Point(
    200,
    (100 / 3) * (Math.max(inputPinCount, outputPinCount) + 1)
  );

export default class CCComponentEditorRendererNode {
  #store: CCStore;

  #componentEditorStore: ComponentEditorStore;

  #unsubscribeComponentEditorStore: () => void;

  #nodeId: CCNodeId;

  #pixiParentContainer: PIXI.Container;

  #pixiGraphics: PIXI.Graphics;

  static readonly #componentNameFontSize = 24;

  static readonly #edgeNameFontSize = 16;

  #pixiTexts: PixiTexts;

  #pinRenderers = new Map<CCPinId, CCComponentEditorRendererPin>();

  #inputRenderers = new Map<CCPinId, CCComponentEditorRendererInput>();

  #pixiWorld: PIXI.Container;

  constructor(props: CCComponentEditorRendererNodeProps) {
    this.#store = props.store;
    this.#componentEditorStore = props.componentEditorStore;
    this.#nodeId = props.nodeId;
    this.#pixiParentContainer = props.pixiParentContainer;
    this.#pixiGraphics = new PIXI.Graphics();
    this.#pixiGraphics.interactive = true;
    this.#pixiTexts = this.#createText();
    this.#pixiWorld = new PIXI.Container();
    this.#pixiParentContainer.addChild(this.#pixiWorld);
    this.#pixiWorld.addChild(this.#pixiGraphics);
    this.#pixiWorld.addChild(this.#pixiTexts.componentName);

    const node = this.#store.nodes.get(this.#nodeId)!;
    const pinIds = this.#store.pins.getPinIdsByComponentId(node.componentId);
    for (const pinId of pinIds) {
      const pinRenderer = new CCComponentEditorRendererPin({
        store: props.store,
        nodeId: props.nodeId,
        pinId,
        pixiParentContainer: this.#pixiWorld,
        pixiText: this.#pixiTexts.pinNames.get(pinId)!,
        onDragStart: props.onDragStartPin,
        onDragEnd: props.onDragEndPin,
      });
      this.#pinRenderers.set(pinId, pinRenderer);
    }

    this.reconcileChildInputRenderers();

    this.#pixiGraphics.on("pointerdown", (e) => {
      if (
        !this.#componentEditorStore.getState().selectedNodeIds.has(this.#nodeId)
      ) {
        this.#componentEditorStore
          .getState()
          .selectNode([this.#nodeId], !e.shiftKey);
      }
      props.onDragStart(e);
      e.stopPropagation();
    });
    this.#store.nodes.on("didUpdate", this.render);
    this.#store.components.on("didUpdate", this.reconcileChildInputRenderers);
    this.#unsubscribeComponentEditorStore =
      this.#componentEditorStore.subscribe(this.render);
    this.render();
  }

  onPointerDown(event: (e: PIXI.FederatedPointerEvent) => void) {
    this.#pixiGraphics.on("pointerdown", event);
  }

  #createText(): PixiTexts {
    const node = this.#store.nodes.get(this.#nodeId)!;
    const component = this.#store.components.get(node.componentId)!;
    const pins = this.#store.pins
      .getPinIdsByComponentId(component.id)
      .map((pinId) => this.#store.pins.get(pinId)!);

    const componentName = new PIXI.Text(component.name, {
      fontSize: CCComponentEditorRendererNode.#componentNameFontSize,
    });
    const map = new Map<string, PIXI.Text>();
    for (const pin of pins) {
      map.set(
        pin.id,
        new PIXI.Text(pin.name, {
          fontSize: CCComponentEditorRendererNode.#edgeNameFontSize,
        })
      );
    }
    return { componentName, pinNames: map };
  }

  render = () => {
    const node = this.#store.nodes.get(this.#nodeId)!;
    const component = this.#store.components.get(node.componentId)!;
    const pins = this.#store.pins
      .getPinIdsByComponentId(component.id)
      .map((pinId) => this.#store.pins.get(pinId)!);
    const inputPins = pins.filter((pin) => pin.type === "input");
    const outputPins = pins.filter((pin) => pin.type === "output");
    const size = getSize(inputPins.length, outputPins.length);
    const borderWidth = 3;
    const outlineWidth = 1;
    this.#pixiGraphics.clear();
    this.#pixiGraphics.beginFill(whiteColor);
    this.#pixiGraphics.lineStyle({
      color: blackColor,
      width: borderWidth,
      alignment: 1,
    });
    this.#pixiGraphics.drawRect(-size.x / 2, -size.y / 2, size.x, size.y);
    this.#pixiGraphics.endFill();
    const gap = 6;
    const edgeSize = 10;
    inputPins.forEach((pin, index) => {
      const pinRenderer = this.#pinRenderers.get(pin.id);
      pinRenderer?.render(index, size, inputPins.length);
    });
    outputPins.forEach((pin, index) => {
      const pinRenderer = this.#pinRenderers.get(pin.id);
      pinRenderer?.render(index, size, outputPins.length);
    });
    this.#pixiTexts.componentName.anchor.set(0, 1);
    this.#pixiTexts.componentName.x = -size.x / 2;
    this.#pixiTexts.componentName.y = -size.y / 2 - gap;

    if (
      this.#componentEditorStore.getState().selectedNodeIds.has(this.#nodeId)
    ) {
      this.#pixiGraphics.lineStyle({
        color: primaryColor,
        width: outlineWidth,
        alignment: 1,
      });
      const margin = 8;
      this.#pixiGraphics.drawRect(
        -size.x / 2 - borderWidth * 1.5 - edgeSize / 2,
        -size.y / 2 -
          CCComponentEditorRendererNode.#componentNameFontSize -
          margin,
        size.x + borderWidth * 3 + edgeSize,
        size.y +
          CCComponentEditorRendererNode.#componentNameFontSize +
          margin +
          borderWidth / 2 -
          outlineWidth / 2
      );
    }
    this.#pixiWorld.position = node.position;
  };

  reconcileChildInputRenderers = () => {
    const node = this.#store.nodes.get(this.#nodeId)!;
    const pinIds = this.#store.pins.getPinIdsByComponentId(node.componentId);

    const existingInputRenderers = new Map(this.#inputRenderers);
    const newInputRenderers = new Map<
      CCPinId,
      CCComponentEditorRendererInput
    >();
    for (const pinId of pinIds) {
      if (
        !this.#store.connections.getConnectionIdByPinId(this.#nodeId, pinId)
      ) {
        const existingInputRenderer = existingInputRenderers.get(pinId);
        if (existingInputRenderer) {
          newInputRenderers.set(pinId, existingInputRenderer);
          existingInputRenderers.delete(pinId);
        } else {
          const inputRenderer = new CCComponentEditorRendererInput({
            store: this.#store,
            componentEditorStore: this.#componentEditorStore,
            pixiParentContainer: this.#pixiWorld,
            nodeId: this.#nodeId,
            pinId,
            position: CCComponentEditorRendererNode.getPinOffset(
              this.#store,
              this.#nodeId,
              pinId
            ),
          });
          newInputRenderers.set(pinId, inputRenderer);
        }
      }
    }
    for (const inputRenderer of existingInputRenderers.values()) {
      inputRenderer.destroy();
    }
    this.#inputRenderers = newInputRenderers;
  };

  destroy() {
    this.#pixiGraphics.destroy();
    this.#pixiTexts.componentName.destroy();
    for (const text of this.#pixiTexts.pinNames) {
      text[1].destroy();
    }
    for (const pinRenderer of this.#pinRenderers.values()) {
      pinRenderer.destroy();
    }
    for (const inputRenderer of this.#inputRenderers.values()) {
      inputRenderer.destroy();
    }
    this.#store.nodes.off("didUpdate", this.render);
    this.#store.components.off("didUpdate", this.reconcileChildInputRenderers);
    this.#unsubscribeComponentEditorStore();
  }

  static getPinOffset(store: CCStore, nodeId: CCNodeId, pinId: CCPinId): Point {
    const node = store.nodes.get(nodeId)!;
    const component = store.components.get(node.componentId)!;
    const pinIds = store.pins.getPinIdsByComponentId(component.id)!;
    const pins = pinIds.map((id) => store.pins.get(id)!);
    const inputPinIds = pins
      .filter((pin) => pin.type === "input")
      .map((pin) => pin.id);
    const inputPinCount = inputPinIds.length;
    const outputPinIds = pins
      .filter((pin) => pin.type === "output")
      .map((pin) => pin.id);
    const outputPinCount = outputPinIds.length;
    const size = getSize(inputPinCount, outputPinCount);
    if (inputPinIds.includes(pinId)) {
      const pinIndex = inputPinIds.indexOf(pinId);
      return new PIXI.Point(
        -size.x / 2,
        -size.y / 2 + (size.y / (inputPinCount + 1)) * (pinIndex + 1)
      );
    }
    if (outputPinIds.includes(pinId)) {
      const pinIndex = outputPinIds.indexOf(pinId);
      return new PIXI.Point(
        size.x / 2,
        -size.y / 2 + (size.y / (outputPinCount + 1)) * (pinIndex + 1)
      );
    }

    throw Error(`pin: ${pinId} not found in node: ${node.id}`);
  }

  static getPinAbsolute(
    store: CCStore,
    nodeId: CCNodeId,
    pinId: CCPinId
  ): Point {
    const node = store.nodes.get(nodeId)!;
    const component = store.components.get(node.componentId)!;
    const pinIds = store.pins.getPinIdsByComponentId(component.id)!;
    const pins = pinIds.map((id) => store.pins.get(id)!);
    const inputPinIds = pins
      .filter((pin) => pin.type === "input")
      .map((pin) => pin.id);
    const inputPinCount = inputPinIds.length;
    const outputPinIds = pins
      .filter((pin) => pin.type === "output")
      .map((pin) => pin.id);
    const outputPinCount = outputPinIds.length;
    const size = getSize(inputPinCount, outputPinCount);
    if (inputPinIds.includes(pinId)) {
      const pinIndex = inputPinIds.indexOf(pinId);
      return new PIXI.Point(
        node.position.x - size.x / 2,
        node.position.y -
          size.y / 2 +
          (size.y / (inputPinCount + 1)) * (pinIndex + 1)
      );
    }
    if (outputPinIds.includes(pinId)) {
      const pinIndex = outputPinIds.indexOf(pinId);
      return new PIXI.Point(
        node.position.x + size.x / 2,
        node.position.y -
          size.y / 2 +
          (size.y / (outputPinCount + 1)) * (pinIndex + 1)
      );
    }

    throw Error(`pin: ${pinId} not found in node: ${node.id}`);
  }
}
