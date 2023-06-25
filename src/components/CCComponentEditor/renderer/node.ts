import type { Point } from "pixi.js";
import * as PIXI from "pixi.js";
import {
  blackColor,
  grayColor,
  primaryColor,
  whiteColor,
} from "../../../common/theme";
import type { CCNodeId } from "../../../store/node";
import type { CCPinId } from "../../../store/pin";
import type CCStore from "../../../store";
import CCComponentEditorRendererPin from "./pin";

export type CCComponentEditorRendererNodeProps = {
  store: CCStore;
  nodeId: CCNodeId;
  pixiParentContainer: PIXI.Container;
  onDragStart(e: PIXI.FederatedMouseEvent): void;
};

type PixiTexts = {
  componentName: PIXI.Text;
  pinNames: Map<string, PIXI.Text>;
};

export default class CCComponentEditorRendererNode {
  #store: CCStore;

  #nodeId: CCNodeId;

  #pixiParentContainer: PIXI.Container;

  #pixiGraphics: PIXI.Graphics;

  static readonly #size = new PIXI.Point(200, 100);

  static readonly #componentNameFontSize = 24;

  static readonly #edgeNameFontSize = 16;

  isSelected = false;

  #pixiTexts: PixiTexts;

  #pinRenderers = new Map<CCPinId, CCComponentEditorRendererPin>();

  constructor({
    store,
    nodeId,
    pixiParentContainer,
    onDragStart,
  }: CCComponentEditorRendererNodeProps) {
    this.#store = store;
    this.#nodeId = nodeId;
    this.#pixiParentContainer = pixiParentContainer;
    this.#pixiGraphics = new PIXI.Graphics();
    this.#pixiGraphics.interactive = true;
    this.#pixiTexts = this.#createText();
    this.#pixiParentContainer.addChild(this.#pixiGraphics);
    this.#pixiGraphics.addChild(
      this.#pixiTexts.componentName,
      ...this.#pixiTexts.pinNames.values()
    );
    const node = this.#store.nodes.get(this.#nodeId)!;
    const component = this.#store.components.get(node.componentId)!;
    const pinIds = this.#store.pins.getPinIdsByComponentId(component.id);
    for (const pinId of pinIds) {
      const pinRenderer = new CCComponentEditorRendererPin({
        store,
        nodeId,
        pinId,
        pixiParentContainer,
      });
      this.#pinRenderers.set(pinId, pinRenderer);
      // pinRenderer.render();
    }

    this.#store.nodes.on("didUpdate", this.render);
    this.render();
    // eslint-disable-next-line no-unused-expressions
    onDragStart;
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
    const borderWidth = 3;
    const outlineWidth = 1;
    this.#pixiGraphics.clear();
    this.#pixiGraphics.beginFill(whiteColor);
    this.#pixiGraphics.lineStyle({
      color: blackColor,
      width: borderWidth,
      alignment: 1,
    });
    this.#pixiGraphics.drawRect(
      node.position.x - CCComponentEditorRendererNode.#size.x / 2,
      node.position.y - CCComponentEditorRendererNode.#size.y / 2,
      CCComponentEditorRendererNode.#size.x,
      CCComponentEditorRendererNode.#size.y
    );
    this.#pixiGraphics.endFill();
    // const inputEdgeGap =
    //   CCComponentEditorRendererNode.#size.y / (inputPins.length + 1);
    const gap = 6;
    const edgeSize = 10;
    inputPins.forEach((pin, index) => {
      const pinRenderer = this.#pinRenderers.get(pin.id);
      pinRenderer?.render(
        index,
        CCComponentEditorRendererNode.#size,
        inputPins.length,
        this.#pixiTexts.pinNames
      );
      // const position = {
      //   x:
      //     node.position.x -
      //     CCComponentEditorRendererNode.#size.x / 2 -
      //     edgeSize / 2 -
      //     borderWidth / 2,
      //   y:
      //     node.position.y -
      //     CCComponentEditorRendererNode.#size.y / 2 +
      //     inputEdgeGap * (index + 1) -
      //     edgeSize / 2,
      // };
      // this.#pixiGraphics.drawRoundedRect(
      //   position.x,
      //   position.y,
      //   edgeSize,
      //   edgeSize,
      //   2
      // );
      // const pinName = this.#pixiTexts.pinNames.get(pin.id);
      // if (pinName) {
      //   pinName.x = position.x + edgeSize + gap;
      //   pinName.y = position.y;
      //   pinName.anchor.set(0, 0.25);
      // }
    });
    // const outputPinGap =
    //   CCComponentEditorRendererNode.#size.y / (outputPins.length + 1);
    outputPins.forEach((edge, index) => {
      const pinRenderer = this.#pinRenderers.get(edge.id);
      pinRenderer?.render(
        index,
        CCComponentEditorRendererNode.#size,
        outputPins.length,
        this.#pixiTexts.pinNames
      );
      // const position = {
      //   x:
      //     node.position.x +
      //     CCComponentEditorRendererNode.#size.x / 2 -
      //     edgeSize / 2 +
      //     borderWidth / 2,
      //   y:
      //     node.position.y -
      //     CCComponentEditorRendererNode.#size.y / 2 +
      //     outputPinGap * (index + 1) -
      //     edgeSize / 2,
      // };
      // this.#pixiGraphics.drawRoundedRect(
      //   position.x,
      //   position.y,
      //   edgeSize,
      //   edgeSize,
      //   2
      // );
      // const edgeName = this.#pixiTexts.pinNames.get(edge.id);
      // if (edgeName) {
      //   edgeName.x = position.x - gap;
      //   edgeName.y = position.y;
      //   edgeName.anchor.set(1, 0.25);
      // }
    });
    // this.#pixiGraphics.endFill();
    this.#pixiGraphics.beginFill(grayColor);
    this.#pixiGraphics.endFill();
    this.#pixiTexts.componentName.anchor.set(0, 1);
    this.#pixiTexts.componentName.x =
      node.position.x - CCComponentEditorRendererNode.#size.x / 2;
    this.#pixiTexts.componentName.y =
      node.position.y - CCComponentEditorRendererNode.#size.y / 2 - gap;

    if (this.isSelected) {
      this.#pixiGraphics.lineStyle({
        color: primaryColor,
        width: outlineWidth,
        alignment: 1,
      });
      const margin = 8;
      this.#pixiGraphics.drawRect(
        node.position.x -
          CCComponentEditorRendererNode.#size.x / 2 -
          borderWidth * 1.5 -
          edgeSize / 2,
        node.position.y -
          CCComponentEditorRendererNode.#size.y / 2 -
          CCComponentEditorRendererNode.#componentNameFontSize -
          margin,
        CCComponentEditorRendererNode.#size.x + borderWidth * 3 + edgeSize,
        CCComponentEditorRendererNode.#size.y +
          CCComponentEditorRendererNode.#componentNameFontSize +
          margin +
          borderWidth / 2 -
          outlineWidth / 2
      );
    }
  };

  destroy() {
    this.#pixiGraphics.destroy();
    this.#pixiTexts.componentName.destroy();
    for (const text of this.#pixiTexts.pinNames) {
      text[1].destroy();
    }
    this.#store.nodes.off("didUpdate", this.render);
  }

  getPinPosition(pinId: CCPinId): Point {
    const node = this.#store.nodes.get(this.#nodeId)!;
    const component = this.#store.components.get(node.componentId)!;
    const pinIds = this.#store.pins.getPinIdsByComponentId(component.id)!;
    const pins = pinIds.map((id) => this.#store.pins.get(id)!);
    const inputPinIds = pins
      .filter((pin) => pin.type === "input")
      .map((pin) => pin.id);
    const inputPinCount = inputPinIds.length;
    const outputPinIds = pins
      .filter((pin) => pin.type === "output")
      .map((pin) => pin.id);
    const outputPinCount = outputPinIds.length;
    if (inputPinIds.includes(pinId)) {
      const pinIndex = inputPinIds.indexOf(pinId);
      return new PIXI.Point(
        node.position.x - CCComponentEditorRendererNode.#size.x / 2,
        node.position.y -
          CCComponentEditorRendererNode.#size.y / 2 +
          (CCComponentEditorRendererNode.#size.y / (inputPinCount + 1)) *
            (pinIndex + 1)
      );
    }
    if (outputPinIds.includes(pinId)) {
      const pinIndex = outputPinIds.indexOf(pinId);
      return new PIXI.Point(
        node.position.x + CCComponentEditorRendererNode.#size.x / 2,
        node.position.y -
          CCComponentEditorRendererNode.#size.y / 2 +
          (CCComponentEditorRendererNode.#size.y / (outputPinCount + 1)) *
            (pinIndex + 1)
      );
    }

    throw Error(`pin: ${pinId} not found in node: ${this.#nodeId}`);
  }
}
