import * as PIXI from "pixi.js";
import type CCStore from "../../../store";
import type { ComponentEditorStore } from "../store";
import type { CCNodeId } from "../../../store/node";
import type { CCPinId } from "../../../store/pin";
import { editorGridColor, whiteColor } from "../../../common/theme";

type CCComponentEditorRendererInputProps = {
  store: CCStore;
  componentEditorStore: ComponentEditorStore;
  pixiParentContainer: PIXI.Container;
  nodeId: CCNodeId;
  pinId: CCPinId;
  position: PIXI.Point;
};

export default class CCComponentEditorRendererInput {
  readonly #store: CCStore;

  readonly #componentEditorStore: ComponentEditorStore;

  readonly #nodeId: CCNodeId;

  readonly #pinId: CCPinId;

  position: PIXI.Point;

  readonly #pixiParentContainer: PIXI.Container;

  readonly #pixiContainer: PIXI.Container;

  readonly #pixiGraphics: PIXI.Graphics;

  readonly #unsubscribeComponentEditorStore: () => void;

  constructor(props: CCComponentEditorRendererInputProps) {
    this.#store = props.store;
    this.#nodeId = props.nodeId;
    this.#pinId = props.pinId;
    this.position = props.position;
    this.#componentEditorStore = props.componentEditorStore;
    this.#pixiParentContainer = props.pixiParentContainer;
    this.#pixiContainer = new PIXI.Container();
    this.#pixiParentContainer.addChild(this.#pixiContainer);
    this.#pixiGraphics = new PIXI.Graphics();
    this.#pixiGraphics.interactive = true;
    this.#pixiGraphics.cursor = "pointer";
    this.#pixiContainer.addChild(this.#pixiGraphics);
    this.#unsubscribeComponentEditorStore =
      this.#componentEditorStore.subscribe(this.render);
    this.render();
  }

  render = () => {
    const pin = this.#store.pins.get(this.#pinId)!;
    this.#pixiContainer.position = this.position;
    this.#pixiGraphics.clear();
    this.#pixiGraphics.lineStyle(1, editorGridColor);
    this.#pixiGraphics.beginFill(whiteColor);
    this.#pixiGraphics.drawRoundedRect(
      pin.type === "input" ? -60 - 10 : 10,
      -10,
      60,
      20,
      1000
    );
    this.#pixiGraphics.endFill();
  };

  destroy() {
    this.#pixiParentContainer.removeChild(this.#pixiContainer);
  }
}
