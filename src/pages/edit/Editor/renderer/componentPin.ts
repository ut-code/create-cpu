import * as PIXI from "pixi.js";
import invariant from "tiny-invariant";
import type { EditorModePlay } from "../store";
import type { CCNodeId } from "../../../../store/node";
import type { CCComponentPinId } from "../../../../store/componentPin";
import {
  activeColor,
  editorGridColor,
  errorColor,
  grayColor,
  whiteColor,
} from "../../../../common/theme";
import { CCComponentEditorRendererTextBox } from "./textBox";
import type { CCComponentEditorRendererContext } from "./base";
import CCComponentEditorRendererBase from "./base";

type CCComponentEditorRendererComponentPinProps = {
  context: CCComponentEditorRendererContext;
  pixiParentContainer: PIXI.Container;
  nodeId: CCNodeId; // TODO: this might be unnecessary
  pinId: CCComponentPinId;
  position: PIXI.Point;
  getPinValue: () => boolean[] | undefined;
};

/**
 * Class for rendering component pin
 */
export default class CCComponentEditorRendererComponentPin extends CCComponentEditorRendererBase {
  readonly #componentPinId: CCComponentPinId;

  position: PIXI.Point;

  readonly #pixiParentContainer: PIXI.Container;

  readonly #pixiContainer: PIXI.Container;

  readonly #pixiGraphics: PIXI.Graphics;

  readonly #pixiLabelTextBox: CCComponentEditorRendererTextBox;

  readonly #pixiValueText: PIXI.Text;

  readonly #unsubscribeComponentEditorStore: () => void;

  readonly #getPinValue: () => boolean[] | undefined;

  #valueBoxWidth: number;

  private static readonly drawingConstants = {
    marginToNode: 20,
    marginToValueBox: 10,
    fontSize: 16,
    valueColor: whiteColor,
    valueBoxWidthUnit: 40,
    valueBoxHeight: 20,
    valueBoxRadius: 1000,
  } as const;

  /**
   * Constructor of CCComponentEditorRendererComponentPin
   * @param props
   */
  constructor(props: CCComponentEditorRendererComponentPinProps) {
    super(props.context);
    this.#componentPinId = props.pinId;
    this.position = props.position;
    this.#pixiParentContainer = props.pixiParentContainer;
    this.#pixiContainer = new PIXI.Container();
    this.#pixiParentContainer.addChild(this.#pixiContainer);
    this.#pixiGraphics = new PIXI.Graphics();
    if (
      this.context.store.componentPins.get(this.#componentPinId)!.type ===
      "input"
    ) {
      // this.#pixiGraphics.interactive = true;
      this.#pixiGraphics.eventMode = "dynamic";
      this.#pixiGraphics.cursor = "pointer";
      this.#pixiGraphics.on("pointerdown", this.onClick);
    }
    this.#pixiContainer.addChild(this.#pixiGraphics);
    this.#pixiLabelTextBox = new CCComponentEditorRendererTextBox({
      context: this.context,
      pixiParentContainer: this.#pixiContainer,
    });
    this.#pixiLabelTextBox.onChange = (value) => {
      this.context.store.componentPins.update(this.#componentPinId, {
        name: value,
      });
    };
    this.registerChildRenderer(this.#pixiLabelTextBox);
    this.#pixiLabelTextBox.fontSize =
      CCComponentEditorRendererComponentPin.drawingConstants.fontSize;
    this.#pixiValueText = new PIXI.Text();
    this.#pixiValueText.style.fontSize =
      CCComponentEditorRendererComponentPin.drawingConstants.fontSize;
    this.#pixiValueText.style.fill =
      CCComponentEditorRendererComponentPin.drawingConstants.valueColor;
    this.#pixiValueText.anchor.set(0.5, 0.5);
    if (
      this.context.store.componentPins.get(this.#componentPinId)!.type ===
      "input"
    ) {
      // this.#pixiValueText.interactive = true;
      this.#pixiValueText.eventMode = "dynamic";
      this.#pixiValueText.cursor = "pointer";
      this.#pixiValueText.on("pointerdown", this.onClick);
    }
    this.#pixiContainer.addChild(this.#pixiValueText);
    this.context.store.components.on("didUpdate", this.render);
    this.#unsubscribeComponentEditorStore =
      this.context.componentEditorStore.subscribe(this.render);
    this.#valueBoxWidth =
      CCComponentEditorRendererComponentPin.drawingConstants.valueBoxWidthUnit;
    this.context.store.componentPins.on("didUpdate", (pin) => {
      if (pin.id === this.#componentPinId) this.render();
    });
    this.#getPinValue = props.getPinValue;
    this.render();
  }

  /**
   * Event handler for clicking the pin
   * @param e event
   */
  onClick = (e: PIXI.FederatedPointerEvent) => {
    const componentPin = this.context.store.componentPins.get(
      this.#componentPinId
    );
    invariant(componentPin);
    invariant(componentPin.implementation);
    const editorState = this.context.componentEditorStore.getState();
    const previousValue = editorState.getInputValue(this.#componentPinId);
    invariant(previousValue);
    const increaseValue = (value: boolean[]) => {
      const newValue = [...value];
      for (let i = newValue.length - 1; i >= 0; i -= 1) {
        newValue[i] = !newValue[i];
        if (newValue[i]) break;
      }
      return newValue;
    };
    editorState.setInputValue(
      this.#componentPinId,
      increaseValue(previousValue)
    );
    e.preventDefault();
  };

  /**
   * Render the pin
   */
  render = () => {
    const pin = this.context.store.componentPins.get(this.#componentPinId);
    if (!pin) return;

    this.#pixiGraphics.clear();
    const editorState = this.context.componentEditorStore.getState();
    this.#pixiContainer.position = this.position;
    this.#pixiLabelTextBox.value = pin.name;
    const c = CCComponentEditorRendererComponentPin.drawingConstants;
    if (editorState.editorMode === "edit") {
      this.#pixiLabelTextBox.isEditable = true;
      this.#pixiValueText.visible = false;
      this.#valueBoxWidth = c.valueBoxWidthUnit;
      this.#pixiGraphics.lineStyle(1, editorGridColor);
      this.#pixiGraphics.beginFill(whiteColor);

      this.#pixiLabelTextBox.alignment = "center";
      this.#pixiLabelTextBox.position.set(
        (c.marginToNode + c.valueBoxWidthUnit / 2) *
          (pin.type === "input" ? -1 : 1),
        0
      );
    } else if (editorState.editorMode === "play") {
      invariant((editorState.editorMode satisfies EditorModePlay) === "play");
      this.#pixiLabelTextBox.isEditable = false;
      if (pin.type === "input") {
        this.#valueBoxWidth = c.valueBoxWidthUnit;
        const input = editorState.getInputValue(this.#componentPinId);
        invariant(input);
        this.#pixiValueText.text = input.map((v) => (v ? "1" : "0")).join("");
        this.#pixiGraphics.beginFill(activeColor);
      } else {
        const createValueText = (values: boolean[]) => {
          let valueText = "";
          for (let i = 0; i < values.length; i += 1) {
            valueText += values[i] ? "1" : "0";
          }
          return valueText;
        };
        const outputValue = this.#getPinValue();
        if (outputValue) {
          this.#pixiValueText.text = createValueText(outputValue);
          this.#valueBoxWidth =
            c.valueBoxWidthUnit +
            ((outputValue.length - 1) * c.valueBoxWidthUnit) / 4;
          this.#pixiGraphics.beginFill(grayColor.darken2);
        } else {
          this.#pixiValueText.text = "";
          this.#pixiGraphics.beginFill(errorColor);
        }
      }
      this.#pixiLabelTextBox.alignment =
        pin.type === "input" ? "right" : "left";
      this.#pixiLabelTextBox.position.set(
        (c.marginToNode + this.#valueBoxWidth + c.marginToValueBox) *
          (pin.type === "input" ? -1 : 1),
        0
      );
      this.#pixiValueText.visible = true;
      this.#pixiValueText.position.set(
        (c.marginToNode + this.#valueBoxWidth / 2) *
          (pin.type === "input" ? -1 : 1),
        0
      );
    }
    this.#pixiLabelTextBox.render();

    this.#pixiGraphics.drawRoundedRect(
      pin.type === "input"
        ? -c.valueBoxWidthUnit - c.marginToNode
        : c.marginToNode,
      -c.valueBoxHeight / 2,
      this.#valueBoxWidth,
      c.valueBoxHeight,
      c.valueBoxRadius
    );
    this.#pixiGraphics.endFill();
  };

  /**
   * Destroy the pin
   */
  override destroy() {
    this.#pixiParentContainer.removeChild(this.#pixiContainer);
    this.context.store.components.off("didUpdate", this.render);
    this.#unsubscribeComponentEditorStore();
    super.destroy();
  }
}
