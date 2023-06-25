import * as PIXI from "pixi.js";
import type CCStore from "../../../store";
import type { CCPinId } from "../../../store/pin";
import type { CCNodeId } from "../../../store/node";
import { blackColor, whiteColor } from "../../../common/theme";

export type CCComponentEditorRendererPinProps = {
  store: CCStore;
  nodeId: CCNodeId;
  pinId: CCPinId;
  pixiParentContainer: PIXI.Container;
};

export default class CCComponentEditorRendererPin {
  #store: CCStore;

  #nodeId: CCNodeId;

  #pinId: CCPinId;

  #pixiParentContainer: PIXI.Container;

  #pixiGraphics: PIXI.Graphics;

  isSelected = false;

  constructor({
    store,
    nodeId,
    pinId,
    pixiParentContainer,
  }: CCComponentEditorRendererPinProps) {
    this.#store = store;
    this.#nodeId = nodeId;
    this.#pinId = pinId;
    this.#pixiParentContainer = pixiParentContainer;
    this.#pixiGraphics = new PIXI.Graphics();
    this.#pixiGraphics.interactive = true;
    this.#pixiParentContainer.addChild(this.#pixiGraphics);
  }

  render(
    index: number,
    size: PIXI.Point,
    pinsLength: number,
    pinNames: Map<string, PIXI.Text>
  ) {
    const pin = this.#store.pins.get(this.#pinId)!;
    const gap = 6;
    const edgeSize = 10;
    const borderWidth = 3;
    const node = this.#store.nodes.get(this.#nodeId)!;
    const edgeGap = size.y / (pinsLength + 1);
    const sign = pin.type === "input" ? 1 : -1;
    const position = {
      x:
        node.position.x -
        (sign * size.x) / 2 -
        edgeSize / 2 -
        (sign * borderWidth) / 2,
      y: node.position.y - size.y / 2 + edgeGap * (index + 1) - edgeSize / 2,
    };
    this.#pixiGraphics.clear();
    this.#pixiGraphics.beginFill(whiteColor);
    this.#pixiGraphics.lineStyle({
      color: blackColor,
      width: borderWidth,
      alignment: 1,
    });
    this.#pixiGraphics.drawRoundedRect(
      position.x,
      position.y,
      edgeSize,
      edgeSize,
      2
    );
    this.#pixiGraphics.endFill();
    const pinName = pinNames.get(pin.id);
    if (pinName) {
      pinName.x = position.x + edgeSize + gap;
      pinName.y = position.y;
      pinName.anchor.set(0, 0.25);
    }
  }
}
