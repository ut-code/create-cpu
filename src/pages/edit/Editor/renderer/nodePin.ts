import * as PIXI from "pixi.js";
import type CCStore from "../../../../store";
import type { CCPinId } from "../../../../store/pin";
import type { CCNodeId } from "../../../../store/node";
import { blackColor, whiteColor, primaryColor } from "../../../../common/theme";

export type CCComponentEditorRendererNodePinProps = {
  store: CCStore;
  nodeId: CCNodeId;
  pinId: CCPinId;
  pixiParentContainer: PIXI.Container;
  pixiText: PIXI.Text;
  onDragStart(e: PIXI.FederatedMouseEvent, pinId: CCPinId): void;
  onDragEnd(e: PIXI.FederatedMouseEvent, pinId: CCPinId): void;
};

export default class CCComponentEditorRendererNodePin {
  #store: CCStore;

  #pinId: CCPinId;

  #pixiParentContainer: PIXI.Container;

  #pixiWorld: PIXI.Container;

  #pixiGraphics: PIXI.Graphics;

  #pixiText: PIXI.Text;

  isSelected = false;

  constructor({
    store,
    pinId,
    pixiParentContainer,
    pixiText,
    onDragStart,
    onDragEnd,
  }: CCComponentEditorRendererNodePinProps) {
    this.#store = store;
    this.#pinId = pinId;
    this.#pixiParentContainer = pixiParentContainer;
    this.#pixiWorld = new PIXI.Container();
    this.#pixiParentContainer.addChild(this.#pixiWorld);
    this.#pixiGraphics = new PIXI.Graphics();
    this.#pixiGraphics.interactive = true;
    this.#pixiGraphics.cursor = "pointer";
    this.#pixiWorld.addChild(this.#pixiGraphics);
    this.#pixiText = pixiText;
    this.#pixiWorld.addChild(this.#pixiText);
    this.#pixiGraphics.on("pointerdown", (e) => {
      onDragStart(e, pinId);
      e.stopPropagation();
    });
    this.#pixiGraphics.on("pointerup", (e) => {
      onDragEnd(e, pinId);
      e.stopPropagation();
    });
  }

  onPointerDown(event: (e: PIXI.FederatedPointerEvent) => void) {
    this.#pixiGraphics.on("pointerdown", event);
  }

  render(index: number, size: PIXI.Point, pinsLength: number) {
    const pin = this.#store.pins.get(this.#pinId)!;
    const gap = 6;
    const edgeSize = 10;
    const borderWidth = 3;
    const edgeGap = size.y / (pinsLength + 1);
    const sign = pin.type === "input" ? 1 : -1;
    const position = {
      x: -(sign * size.x) / 2 - edgeSize / 2 - (sign * borderWidth) / 2,
      y: -size.y / 2 + edgeGap * (index + 1) - edgeSize / 2,
    };
    this.#pixiGraphics.clear();
    this.#pixiGraphics.beginFill(whiteColor);
    this.#pixiGraphics.lineStyle({
      color: blackColor,
      width: borderWidth,
      alignment: 1,
    });
    this.#pixiGraphics.drawRoundedRect(0, 0, edgeSize, edgeSize, 2);
    this.#pixiGraphics.endFill();
    if (this.#pixiText) {
      if (pin.type === "input") {
        this.#pixiText.x = edgeSize + gap;
        this.#pixiText.y = 0;
        this.#pixiText.anchor.set(0, 0.25);
      } else if (pin.type === "output") {
        this.#pixiText.x = -gap;
        this.#pixiText.y = 0;
        this.#pixiText.anchor.set(1, 0.25);
      }
    }

    if (this.isSelected) {
      this.#pixiGraphics.lineStyle({
        color: primaryColor,
        width: 1,
        alignment: 1,
      });
      this.#pixiGraphics.drawRect(-2, -2, edgeSize + 4, edgeSize + 4);
    }
    this.#pixiWorld.position = position;

    const hitAreaGap = 4;
    const hitArea = new PIXI.Polygon(
      new PIXI.Point(-hitAreaGap, -hitAreaGap),
      new PIXI.Point(-hitAreaGap, edgeSize + hitAreaGap),
      new PIXI.Point(edgeSize + hitAreaGap, edgeSize + hitAreaGap),
      new PIXI.Point(edgeSize + hitAreaGap, -hitAreaGap)
    );
    this.#pixiGraphics.hitArea = hitArea;
  }

  destroy() {
    this.#pixiParentContainer.removeChild(this.#pixiWorld);
  }
}
