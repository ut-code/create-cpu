import * as PIXI from "pixi.js";
import type { CCNodePinId } from "../../../../store/nodePin";
import { blackColor, whiteColor, primaryColor } from "../../../../common/theme";
import CCComponentEditorRendererBase, {
  type CCComponentEditorRendererContext,
} from "./base";

export type CCComponentEditorRendererNodePinProps = {
  context: CCComponentEditorRendererContext;
  nodePinId: CCNodePinId;
  pixiParentContainer: PIXI.Container;
  pixiText: PIXI.Text;
  onDragStart(e: PIXI.FederatedMouseEvent, nodePinId: CCNodePinId): void;
  onDragEnd(e: PIXI.FederatedMouseEvent, nodePinId: CCNodePinId): void;
};

/**
 * Class for rendering node pin
 */
export default class CCComponentEditorRendererNodePin extends CCComponentEditorRendererBase {
  #nodePinId: CCNodePinId;

  #pixiParentContainer: PIXI.Container;

  #pixiWorld: PIXI.Container;

  #pixiGraphics: PIXI.Graphics;

  #pixiText: PIXI.Text;

  isSelected = false;

  /**
   * Constructor of CCComponentEditorRendererNodePin
   * @param props
   */
  constructor({
    context,
    nodePinId,
    pixiParentContainer,
    pixiText,
    onDragStart,
    onDragEnd,
  }: CCComponentEditorRendererNodePinProps) {
    super(context);
    this.#nodePinId = nodePinId;
    this.#pixiParentContainer = pixiParentContainer;
    this.#pixiWorld = new PIXI.Container();
    this.#pixiParentContainer.addChild(this.#pixiWorld);
    this.#pixiGraphics = new PIXI.Graphics();
    // this.#pixiGraphics.interactive = true;
    this.#pixiGraphics.eventMode = "dynamic";
    this.#pixiGraphics.cursor = "pointer";
    this.#pixiWorld.addChild(this.#pixiGraphics);
    this.#pixiText = pixiText;
    this.#pixiWorld.addChild(this.#pixiText);
    this.#pixiGraphics.on("pointerdown", (e) => {
      onDragStart(e, nodePinId);
      e.stopPropagation();
    });
    this.#pixiGraphics.on("pointerup", (e) => {
      onDragEnd(e, nodePinId);
      e.stopPropagation();
    });
  }

  /**
   * Event handler for pointer down
   * @param event
   */
  onPointerDown(event: (e: PIXI.FederatedPointerEvent) => void) {
    this.#pixiGraphics.on("pointerdown", event);
  }

  /**
   * Render the node pin
   * @param index index of the pin in node
   * @param size size of the node
   * @param pinsLength length of pins in the node
   */
  render(index: number, size: PIXI.Point, pinsLength: number) {
    const nodePin = this.context.store.nodePins.get(this.#nodePinId)!;
    const componentPin = this.context.store.componentPins.get(
      nodePin.componentPinId
    )!;
    const gap = 6;
    const edgeSize = 10;
    const borderWidth = 3;
    const edgeGap = size.y / (pinsLength + 1);
    const sign = componentPin.type === "input" ? 1 : -1;
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
      if (componentPin.type === "input") {
        this.#pixiText.x = edgeSize + gap;
        this.#pixiText.y = 0;
        this.#pixiText.anchor.set(0, 0.25);
      } else if (componentPin.type === "output") {
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
    this.#pixiWorld.zIndex = 100;
  }

  /**
   * Destroy the node pin
   */
  override destroy() {
    this.#pixiParentContainer.removeChild(this.#pixiWorld);
  }
}
