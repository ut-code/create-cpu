import * as PIXI from "pixi.js";
import type { CCConnection, CCConnectionId } from "../../../store/connection";
import type CCStore from "../../../store";
import type { CCPinId } from "../../../store/pin";
import type { CCNodeId } from "../../../store/node";
import CCComponentEditorRendererNode from "./node";

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

  constructor(
    store: CCStore,
    connectionId: CCConnectionId,
    pixiParentContainer: PIXI.Container,
    onConnectionRemoved: (connection: CCConnection) => void
  ) {
    this.#store = store;
    this.#connectionId = connectionId;
    this.#pixiGraphics = {
      from: CCComponentEditorRendererConnection.#createGraphics(),
      middle: CCComponentEditorRendererConnection.#createGraphics(),
      to: CCComponentEditorRendererConnection.#createGraphics(),
    };
    this.#pixiParentContainer = pixiParentContainer;
    this.#pixiParentContainer.addChild(this.#pixiGraphics.from);
    this.#pixiParentContainer.addChild(this.#pixiGraphics.middle);
    this.#pixiParentContainer.addChild(this.#pixiGraphics.to);
    this.#pixiGraphics.from.on("pointerdown", () => {
      const connection = this.#store.connections.get(this.#connectionId)!;
      onConnectionRemoved(connection);
    });
    this.#pixiGraphics.middle.on("pointerdown", () => {
      const connection = this.#store.connections.get(this.#connectionId)!;
      onConnectionRemoved(connection);
    });
    this.#pixiGraphics.to.on("pointerdown", () => {
      const connection = this.#store.connections.get(this.#connectionId)!;
      onConnectionRemoved(connection);
    });
    this.#bentPortion = 0.5;
    this.#render();
    this.#store.nodes.on("didUpdate", this.#render);
  }

  static #createGraphics() {
    const graphics = new PIXI.Graphics();
    graphics.interactive = true;
    graphics.cursor = "pointer";
    graphics.lineStyle(lineWidth, lineColor);
    return graphics;
  }

  destroy() {
    this.#pixiParentContainer.removeChild(this.#pixiGraphics.from);
    this.#pixiParentContainer.removeChild(this.#pixiGraphics.middle);
    this.#pixiParentContainer.removeChild(this.#pixiGraphics.to);
    this.#pixiGraphics.from.destroy();
    this.#pixiGraphics.to.destroy();
    this.#pixiGraphics.middle.destroy();
    this.#store.connections.unregister(this.#connectionId);
    // this.#store.nodes.off("didUpdate", this.#render);
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
    const fromPosition = CCComponentEditorRendererNode.getPinAbsolute(
      this.#store,
      fromEndPoint?.nodeId as CCNodeId,
      fromEndPoint?.pinId as CCPinId
    );
    const toPosition = CCComponentEditorRendererNode.getPinAbsolute(
      this.#store,
      toEndPoint?.nodeId as CCNodeId,
      toEndPoint?.pinId as CCPinId
    );
    const diffX = toPosition.x - fromPosition.x;
    // const diffY = toPosition.y - fromPosition.y;
    this.#pixiGraphics.from.beginFill(lineColor);
    this.#pixiGraphics.from.moveTo(
      fromPosition.x + lineWidth / 2,
      fromPosition.y - lineWidth / 2
    );
    this.#pixiGraphics.from.lineTo(
      fromPosition.x + this.#bentPortion * diffX,
      fromPosition.y - lineWidth / 2
    );
    this.#pixiGraphics.from.lineTo(
      fromPosition.x + this.#bentPortion * diffX,
      fromPosition.y + lineWidth / 2
    );
    this.#pixiGraphics.from.lineTo(
      fromPosition.x + lineWidth / 2,
      fromPosition.y + lineWidth / 2
    );
    this.#pixiGraphics.from.endFill();

    this.#pixiGraphics.middle.beginFill(lineColor);
    this.#pixiGraphics.middle.moveTo(
      fromPosition.x + this.#bentPortion * diffX - lineWidth / 2,
      fromPosition.y
    );
    this.#pixiGraphics.middle.lineTo(
      fromPosition.x + this.#bentPortion * diffX - lineWidth / 2,
      toPosition.y
    );
    this.#pixiGraphics.middle.lineTo(
      fromPosition.x + this.#bentPortion * diffX + lineWidth / 2,
      toPosition.y
    );
    this.#pixiGraphics.middle.lineTo(
      fromPosition.x + this.#bentPortion * diffX + lineWidth / 2,
      fromPosition.y
    );
    this.#pixiGraphics.middle.endFill();
    this.#pixiGraphics.to.beginFill(lineColor);
    this.#pixiGraphics.to.moveTo(
      fromPosition.x + this.#bentPortion * diffX,
      toPosition.y - lineWidth / 2
    );
    this.#pixiGraphics.to.lineTo(
      toPosition.x - lineWidth / 2,
      toPosition.y - lineWidth / 2
    );
    this.#pixiGraphics.to.lineTo(
      toPosition.x - lineWidth / 2,
      toPosition.y + lineWidth / 2
    );
    this.#pixiGraphics.to.lineTo(
      fromPosition.x + this.#bentPortion * diffX,
      toPosition.y + lineWidth / 2
    );
    this.#pixiGraphics.to.lineTo(toPosition.x, toPosition.y);
    this.#pixiGraphics.to.endFill();
  };
}
