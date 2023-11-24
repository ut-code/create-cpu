import * as PIXI from "pixi.js";
import type { CCConnectionId } from "../../../../store/connection";
import type CCStore from "../../../../store";
import type { CCPinId } from "../../../../store/pin";
import type { CCNodeId } from "../../../../store/node";
import CCComponentEditorRendererNode from "./node";
import type { ComponentEditorStore } from "../store";

export type CCConnectionEndpoint = {
  nodeId: string;
  pinId: string;
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

  #bentPortionCache: number;

  #temporaryBentPortion: number;

  #offset: number;

  #componentEditorStore: ComponentEditorStore;

  #onDragStart: (e: PIXI.FederatedMouseEvent) => void;

  constructor(
    store: CCStore,
    connectionId: CCConnectionId,
    pixiParentContainer: PIXI.Container,
    componentEditorStore: ComponentEditorStore,
    onDragStart: (e: PIXI.FederatedMouseEvent) => void
  ) {
    this.#store = store;
    this.#connectionId = connectionId;
    this.#onDragStart = onDragStart;
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
      if (e.button === 2) {
        this.onPointerDown(e);
      }
    });
    this.#pixiGraphics.middle.on("pointerdown", (e) => {
      if (e.button === 2) {
        this.onPointerDown(e);
      } else if (e.button === 0) {
        this.#onDragStart(e);
        e.stopPropagation();
      }
    });
    this.#pixiGraphics.to.on("pointerdown", (e) => {
      if (e.button === 2) {
        this.onPointerDown(e);
      }
    });
    this.#bentPortionCache = this.#store.connections.get(
      this.#connectionId
    )!.bentPortion;
    this.#temporaryBentPortion = this.#bentPortionCache;
    this.#offset = 0;
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

  onDragEnd() {
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
    this.#bentPortionCache = this.#temporaryBentPortion + this.#offset / diffX;
    if (this.#bentPortionCache > 1) {
      this.#bentPortionCache = 1;
    } else if (this.#bentPortionCache < 0) {
      this.#bentPortionCache = 0;
    }
    this.#temporaryBentPortion = this.#bentPortionCache;
    this.#store.connections.get(this.#connectionId)!.bentPortion =
      this.#bentPortionCache;
    // e.stopPropagation();
  }

  static #createGraphics() {
    const graphics = new PIXI.Graphics();
    // graphics.interactive = true;
    graphics.eventMode = "dynamic";
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

  updateBentPortion(offset: number) {
    this.#offset = offset;
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
    this.#bentPortionCache = this.#temporaryBentPortion + offset / diffX;
    if (this.#bentPortionCache > 1) {
      this.#bentPortionCache = 1;
    } else if (this.#bentPortionCache < 0) {
      this.#bentPortionCache = 0;
    }
    this.#render();
  }

  #render = () => {
    this.#pixiGraphics.from.clear();
    this.#pixiGraphics.middle.clear();
    this.#pixiGraphics.to.clear();
    this.#pixiGraphics.from.lineStyle(lineWidth, lineColor);
    this.#pixiGraphics.middle.lineStyle(lineWidth, lineColor);
    this.#pixiGraphics.to.lineStyle(lineWidth, lineColor);
    const endPointGap = 9;
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
      fromPosition.x + endPointGap,
      fromPosition.y - lineWidth / 2
    );
    this.#pixiGraphics.from.lineTo(
      fromPosition.x + this.#bentPortionCache * diffX,
      fromPosition.y - lineWidth / 2
    );
    this.#pixiGraphics.from.lineTo(
      fromPosition.x + this.#bentPortionCache * diffX,
      fromPosition.y + lineWidth / 2
    );
    this.#pixiGraphics.from.lineTo(
      fromPosition.x + endPointGap,
      fromPosition.y + lineWidth / 2
    );
    this.#pixiGraphics.from.endFill();

    const fromHitArea = new PIXI.Polygon(
      new PIXI.Point(
        fromPosition.x + endPointGap,
        fromPosition.y - 2 * lineWidth
      ),
      new PIXI.Point(
        fromPosition.x + this.#bentPortionCache * diffX,
        fromPosition.y - 2 * lineWidth
      ),
      new PIXI.Point(
        fromPosition.x + this.#bentPortionCache * diffX,
        fromPosition.y + 2 * lineWidth
      ),
      new PIXI.Point(
        fromPosition.x + endPointGap,
        fromPosition.y + 2 * lineWidth
      )
    );
    this.#pixiGraphics.from.hitArea = fromHitArea;

    this.#pixiGraphics.middle.beginFill(lineColor);
    this.#pixiGraphics.middle.moveTo(
      fromPosition.x + this.#bentPortionCache * diffX - lineWidth / 2,
      fromPosition.y + (fromPosition.y < toPosition.y ? -lineWidth : lineWidth)
    );
    this.#pixiGraphics.middle.lineTo(
      fromPosition.x + this.#bentPortionCache * diffX - lineWidth / 2,
      toPosition.y +
        (fromPosition.y < toPosition.y ? lineWidth / 2 : -lineWidth / 2)
    );
    this.#pixiGraphics.middle.lineTo(
      fromPosition.x + this.#bentPortionCache * diffX + lineWidth / 2,
      toPosition.y +
        (fromPosition.y < toPosition.y ? lineWidth / 2 : -lineWidth / 2)
    );
    this.#pixiGraphics.middle.lineTo(
      fromPosition.x + this.#bentPortionCache * diffX + lineWidth / 2,
      fromPosition.y + (fromPosition.y < toPosition.y ? -lineWidth : lineWidth)
    );
    this.#pixiGraphics.middle.endFill();

    const middleHitArea = new PIXI.Polygon(
      new PIXI.Point(
        fromPosition.x + this.#bentPortionCache * diffX - 2 * lineWidth,
        fromPosition.y
      ),
      new PIXI.Point(
        fromPosition.x + this.#bentPortionCache * diffX + 2 * lineWidth,
        fromPosition.y
      ),
      new PIXI.Point(
        fromPosition.x + this.#bentPortionCache * diffX,
        toPosition.y
      ),
      new PIXI.Point(
        fromPosition.x + this.#bentPortionCache * diffX - 2 * lineWidth,
        toPosition.y
      )
    );
    this.#pixiGraphics.middle.hitArea = middleHitArea;

    this.#pixiGraphics.to.beginFill(lineColor);
    this.#pixiGraphics.to.moveTo(
      fromPosition.x + this.#bentPortionCache * diffX,
      toPosition.y - lineWidth / 2
    );
    this.#pixiGraphics.to.lineTo(
      toPosition.x - endPointGap,
      toPosition.y - lineWidth / 2
    );
    this.#pixiGraphics.to.lineTo(
      toPosition.x - endPointGap,
      toPosition.y + lineWidth / 2
    );
    this.#pixiGraphics.to.lineTo(
      fromPosition.x + this.#bentPortionCache * diffX,
      toPosition.y + lineWidth / 2
    );
    this.#pixiGraphics.to.endFill();

    const toHitArea = new PIXI.Polygon(
      new PIXI.Point(toPosition.x - endPointGap, toPosition.y - 2 * lineWidth),
      new PIXI.Point(
        fromPosition.x + this.#bentPortionCache * diffX,
        toPosition.y - 2 * lineWidth
      ),
      new PIXI.Point(
        fromPosition.x + this.#bentPortionCache * diffX,
        toPosition.y + 2 * lineWidth
      ),
      new PIXI.Point(toPosition.x - endPointGap, toPosition.y + 2 * lineWidth)
    );
    this.#pixiGraphics.to.hitArea = toHitArea;
  };
}
