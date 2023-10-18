import * as PIXI from "pixi.js";
import invariant from "tiny-invariant";
import type CCStore from "../../../../store";
import type { ComponentEditorStore, EditorModePlay } from "../store";
import type { CCNodeId } from "../../../../store/node";
import type { CCPinId } from "../../../../store/pin";
import {
  activeColor,
  editorGridColor,
  grayColor,
  whiteColor,
} from "../../../../common/theme";

type CCComponentEditorRendererPortProps = {
  store: CCStore;
  componentEditorStore: ComponentEditorStore;
  pixiParentContainer: PIXI.Container;
  nodeId: CCNodeId;
  pinId: CCPinId;
  position: PIXI.Point;
  simulation: () => Map<CCPinId, boolean>;
};

export default class CCComponentEditorRendererPort {
  readonly #store: CCStore;

  readonly #componentEditorStore: ComponentEditorStore;

  readonly #nodeId: CCNodeId;

  readonly #pinId: CCPinId;

  position: PIXI.Point;

  readonly #pixiParentContainer: PIXI.Container;

  readonly #pixiContainer: PIXI.Container;

  readonly #pixiGraphics: PIXI.Graphics;

  readonly #pixiLabelText: PIXI.Text;

  readonly #pixiValueText: PIXI.Text;

  readonly #unsubscribeComponentEditorStore: () => void;

  readonly #simulation: () => Map<CCPinId, boolean>;

  private static readonly drawingConstants = {
    marginToNode: 20,
    marginToValueBox: 10,
    fontSize: 16,
    valueColor: whiteColor,
    valueBoxWidth: 40,
    valueBoxHeight: 20,
    valueBoxRadius: 1000,
  } as const;

  constructor(props: CCComponentEditorRendererPortProps) {
    this.#store = props.store;
    this.#nodeId = props.nodeId;
    this.#pinId = props.pinId;
    this.position = props.position;
    this.#simulation = props.simulation;
    this.#componentEditorStore = props.componentEditorStore;
    this.#pixiParentContainer = props.pixiParentContainer;
    this.#pixiContainer = new PIXI.Container();
    this.#pixiParentContainer.addChild(this.#pixiContainer);
    this.#pixiGraphics = new PIXI.Graphics();
    if (this.#store.pins.get(this.#pinId)!.type === "input") {
      this.#pixiGraphics.interactive = true;
      this.#pixiGraphics.cursor = "pointer";
      this.#pixiGraphics.on("pointerdown", this.onClick);
    }
    this.#pixiContainer.addChild(this.#pixiGraphics);
    this.#pixiLabelText = new PIXI.Text();
    this.#pixiLabelText.style.fontSize =
      CCComponentEditorRendererPort.drawingConstants.fontSize;
    this.#pixiContainer.addChild(this.#pixiLabelText);
    this.#pixiValueText = new PIXI.Text();
    this.#pixiValueText.style.fontSize =
      CCComponentEditorRendererPort.drawingConstants.fontSize;
    this.#pixiValueText.style.fill =
      CCComponentEditorRendererPort.drawingConstants.valueColor;
    this.#pixiValueText.anchor.set(0.5, 0.5);
    if (this.#store.pins.get(this.#pinId)!.type === "input") {
      this.#pixiValueText.interactive = true;
      this.#pixiValueText.cursor = "pointer";
      this.#pixiValueText.on("pointerdown", this.onClick);
    }
    this.#pixiContainer.addChild(this.#pixiValueText);
    this.#store.components.on("didUpdate", this.render);
    this.#unsubscribeComponentEditorStore =
      this.#componentEditorStore.subscribe(this.render);
    this.render();
  }

  onClick = (e: PIXI.FederatedPointerEvent) => {
    const editorState = this.#componentEditorStore.getState();
    const previousValue = editorState.getInputValue(this.#nodeId, this.#pinId);
    editorState.setInputValue(this.#nodeId, this.#pinId, !previousValue);
    e.preventDefault();
  };

  render = () => {
    this.#pixiGraphics.clear();
    const editorState = this.#componentEditorStore.getState();
    const pin = this.#store.pins.get(this.#pinId)!;
    this.#pixiContainer.position = this.position;
    this.#pixiLabelText.text = pin.name;
    const c = CCComponentEditorRendererPort.drawingConstants;
    if (editorState.editorMode === "edit") {
      this.#pixiValueText.visible = false;
      this.#pixiGraphics.lineStyle(1, editorGridColor);
      this.#pixiGraphics.beginFill(whiteColor);
      this.#pixiLabelText.anchor.set(0.5, 0.5);
      this.#pixiLabelText.position.set(
        (c.marginToNode + c.valueBoxWidth / 2) *
          (pin.type === "input" ? -1 : 1),
        0
      );
    } else if (editorState.editorMode === "play") {
      invariant((editorState.editorMode satisfies EditorModePlay) === "play");
      this.#pixiLabelText.anchor.set(pin.type === "input" ? 1 : 0, 0.5);
      this.#pixiLabelText.position.set(
        (c.marginToNode + c.valueBoxWidth + c.marginToValueBox) *
          (pin.type === "input" ? -1 : 1),
        0
      );
      this.#pixiValueText.visible = true;
      this.#pixiValueText.position.set(
        (c.marginToNode + c.valueBoxWidth / 2) *
          (pin.type === "input" ? -1 : 1),
        0
      );
      if (pin.type === "input") {
        this.#pixiValueText.text = editorState.getInputValue(
          this.#nodeId,
          this.#pinId
        )
          ? "1"
          : "0";
        this.#pixiGraphics.beginFill(activeColor);
      } else {
        const output = this.#simulation();
        for (const [key, value] of output) {
          if (key === this.#pinId) {
            this.#pixiValueText.text = value ? "1" : "0";
          }
        }
        this.#pixiGraphics.beginFill(grayColor.darken2);
      }
    }

    this.#pixiGraphics.drawRoundedRect(
      pin.type === "input" ? -c.valueBoxWidth - c.marginToNode : c.marginToNode,
      -c.valueBoxHeight / 2,
      c.valueBoxWidth,
      c.valueBoxHeight,
      c.valueBoxRadius
    );
    this.#pixiGraphics.endFill();
  };

  destroy() {
    this.#pixiParentContainer.removeChild(this.#pixiContainer);
    this.#store.components.off("didUpdate", this.render);
    this.#unsubscribeComponentEditorStore();
  }
}
