import * as PIXI from "pixi.js";
import type { CCConnectionId } from "../../../store/connection";
import type CCStore from "../../../store";
import type { CCPinId } from "../../../store/pin";
import type { CCNodeId } from "../../../store/node";
import CCComponentEditorRendererNode from "./node";
import type { ComponentEditorStore } from "../store";

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

  #componentEditorStore: ComponentEditorStore;

  constructor(
    store: CCStore,
    connectionId: CCConnectionId,
    pixiParentContainer: PIXI.Container,
    componentEditorStore: ComponentEditorStore
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
    this.#pixiGraphics.from.on("pointerdown", (e) => {
      this.onPointerDown(e);
    });
    this.#pixiGraphics.middle.on("pointerdown", (e) => {
      this.onPointerDown(e);
    });
    this.#pixiGraphics.to.on("pointerdown", (e) => {
      this.onPointerDown(e);
    });
    this.#bentPortion = 0.5;
    this.#componentEditorStore = componentEditorStore;
    this.#render();
    this.#store.nodes.on("didUpdate", this.#render);
  }

  onPointerDown(e: PIXI.FederatedEvent) {
    if (
      !this.#componentEditorStore
        .getState()
        .selectedConnectionIds.has(this.#connectionId)
    ) {
      this.#componentEditorStore
        .getState()
        .selectConnection([this.#connectionId], false);
    }
    e.stopPropagation();
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
    this.#store.nodes.off("didUpdate", this.#render);
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

    const fromHitArea = new PIXI.Polygon(
      new PIXI.Point(fromPosition.x, fromPosition.y - 2 * lineWidth),
      new PIXI.Point(
        fromPosition.x + this.#bentPortion * diffX,
        fromPosition.y - 2 * lineWidth
      ),
      new PIXI.Point(
        fromPosition.x + this.#bentPortion * diffX,
        fromPosition.y + 2 * lineWidth
      ),
      new PIXI.Point(fromPosition.x, fromPosition.y + 2 * lineWidth)
    );

    this.#pixiGraphics.from.hitArea = fromHitArea;

    this.#pixiGraphics.middle.beginFill(lineColor);
    this.#pixiGraphics.middle.moveTo(
      fromPosition.x + this.#bentPortion * diffX - lineWidth / 2,
      fromPosition.y +
        (fromPosition.y < toPosition.y ? -lineWidth / 2 : lineWidth / 2)
    );
    this.#pixiGraphics.middle.lineTo(
      fromPosition.x + this.#bentPortion * diffX - lineWidth / 2,
      toPosition.y +
        (fromPosition.y < toPosition.y ? lineWidth / 2 : -lineWidth / 2)
    );
    this.#pixiGraphics.middle.lineTo(
      fromPosition.x + this.#bentPortion * diffX + lineWidth / 2,
      toPosition.y +
        (fromPosition.y < toPosition.y ? lineWidth / 2 : -lineWidth / 2)
    );
    this.#pixiGraphics.middle.lineTo(
      fromPosition.x + this.#bentPortion * diffX + lineWidth / 2,
      fromPosition.y +
        (fromPosition.y < toPosition.y ? -lineWidth / 2 : lineWidth / 2)
    );
    this.#pixiGraphics.middle.endFill();

    const middleHitArea = new PIXI.Polygon(
      new PIXI.Point(fromPosition.x, fromPosition.y - 2 * lineWidth),
      new PIXI.Point(
        fromPosition.x + this.#bentPortion * diffX,
        fromPosition.y - 2 * lineWidth
      ),
      new PIXI.Point(
        fromPosition.x + this.#bentPortion * diffX,
        fromPosition.y + 2 * lineWidth
      ),
      new PIXI.Point(fromPosition.x, fromPosition.y + 2 * lineWidth)
    );

    this.#pixiGraphics.middle.hitArea = middleHitArea;

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
