import * as PIXI from "pixi.js";
import type { Point } from "pixi.js";
import type { CCConnectionId } from "../../../store/connection";
import type CCStore from "../../../store";
import type { CCPinId } from "../../../store/pin";
import type { CCNodeId } from "../../../store/node";

export type CCConnectionEndpoint = {
  nodeId: string;
  pinId: string;
};

export type CCConnectionRegistrationProps = {
  pixiContainer: PIXI.Container;
  getPinPosition: (endpoint: CCConnectionEndpoint) => PIXI.Point;
};

const lineWidth = 2;
const lineColor = 0x000000;

export default class CCComponentEditorRendererConnection {
  #store: CCStore;

  #connectionId: CCConnectionId;

  #pixiParentContainer: PIXI.Container;

  #pixiGraphics: {
    from: PIXI.Graphics;
    middle: PIXI.Graphics;
    to: PIXI.Graphics;
  };

  #bentPortion: number;

  static readonly #size = new PIXI.Point(200, 100);

  constructor(
    store: CCStore,
    connectionId: CCConnectionId,
    pixiParentContainer: PIXI.Container
  ) {
    this.#store = store;
    this.#connectionId = connectionId;
    this.#pixiGraphics = {
      from: new PIXI.Graphics(),
      middle: new PIXI.Graphics(),
      to: new PIXI.Graphics(),
    };
    this.#pixiParentContainer = pixiParentContainer;
    this.#pixiParentContainer.addChild(this.#pixiGraphics.from);
    this.#pixiParentContainer.addChild(this.#pixiGraphics.middle);
    this.#pixiParentContainer.addChild(this.#pixiGraphics.to);
    this.#pixiGraphics.from.lineStyle(lineWidth, lineColor);
    this.#pixiGraphics.middle.lineStyle(lineWidth, lineColor);
    this.#pixiGraphics.to.lineStyle(lineWidth, lineColor);
    this.#bentPortion = 0.5;
    this.#render();
    this.#store.nodes.on("didUpdate", this.#render);
  }

  getPinPosition(nodeId: CCNodeId, pinId: CCPinId): Point {
    const node = this.#store.nodes.get(nodeId)!;
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
        node.position.x - CCComponentEditorRendererConnection.#size.x / 2,
        node.position.y -
          CCComponentEditorRendererConnection.#size.y / 2 +
          (CCComponentEditorRendererConnection.#size.y / (inputPinCount + 1)) *
            (pinIndex + 1)
      );
    }
    if (outputPinIds.includes(pinId)) {
      const pinIndex = outputPinIds.indexOf(pinId);
      return new PIXI.Point(
        node.position.x + CCComponentEditorRendererConnection.#size.x / 2,
        node.position.y -
          CCComponentEditorRendererConnection.#size.y / 2 +
          (CCComponentEditorRendererConnection.#size.y / (outputPinCount + 1)) *
            (pinIndex + 1)
      );
    }

    throw Error(`pin: ${pinId} not found in node: ${node.id}`);
  }

  destroy() {
    this.#pixiGraphics.from.destroy();
    this.#pixiGraphics.to.destroy();
    this.#pixiGraphics.middle.destroy();
  }

  #render = () => {
    this.#pixiGraphics.from.clear();
    this.#pixiGraphics.middle.clear();
    this.#pixiGraphics.to.clear();
    this.#pixiGraphics.from.lineStyle(lineWidth, lineColor);
    this.#pixiGraphics.middle.lineStyle(lineWidth, lineColor);
    this.#pixiGraphics.to.lineStyle(lineWidth, lineColor);
    const fromEndPoint = this.#store.connections.get(this.#connectionId)?.from;
    const toEndPoint = this.#store.connections.get(this.#connectionId)?.to;
    const fromPosition = this.getPinPosition(
      fromEndPoint?.nodeId as CCNodeId,
      fromEndPoint?.pinId as CCPinId
    );
    const toPosition = this.getPinPosition(
      toEndPoint?.nodeId as CCNodeId,
      toEndPoint?.pinId as CCPinId
    );
    const diffX = toPosition.x - fromPosition.x;
    // const diffY = toPosition.y - fromPosition.y;
    this.#pixiGraphics.from.moveTo(fromPosition.x, fromPosition.y);
    this.#pixiGraphics.from.lineTo(
      fromPosition.x + this.#bentPortion * diffX,
      fromPosition.y
    );
    this.#pixiGraphics.middle.moveTo(
      fromPosition.x + this.#bentPortion * diffX,
      fromPosition.y
    );
    this.#pixiGraphics.middle.lineTo(
      fromPosition.x + this.#bentPortion * diffX,
      toPosition.y
    );
    this.#pixiGraphics.to.moveTo(
      fromPosition.x + this.#bentPortion * diffX,
      toPosition.y
    );
    this.#pixiGraphics.to.lineTo(toPosition.x, toPosition.y);
  };
}
