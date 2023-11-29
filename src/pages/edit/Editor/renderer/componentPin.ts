import * as PIXI from "pixi.js";
import invariant from "tiny-invariant";
import type { EditorModePlay } from "../store";
import type { CCNodeId } from "../../../../store/node";
import type { CCPinId } from "../../../../store/pin";
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

type CCComponentEditorRendererPortProps = {
  context: CCComponentEditorRendererContext;
  pixiParentContainer: PIXI.Container;
  nodeId: CCNodeId;
  pinId: CCPinId;
  position: PIXI.Point;
  simulation: () => Map<CCPinId, boolean>;
  multipleSimulation: () => Map<CCPinId, boolean[]> | null;
};

export default class CCComponentEditorRendererPort extends CCComponentEditorRendererBase {
  readonly #nodeId: CCNodeId;

  readonly #pinId: CCPinId;

  position: PIXI.Point;

  readonly #pixiParentContainer: PIXI.Container;

  readonly #pixiContainer: PIXI.Container;

  readonly #pixiGraphics: PIXI.Graphics;

  readonly #pixiLabelTextBox: CCComponentEditorRendererTextBox;

  readonly #pixiValueText: PIXI.Text;

  readonly #unsubscribeComponentEditorStore: () => void;

  // eslint-disable-next-line
  // @ts-ignore
  readonly #simulation: () => Map<CCPinId, boolean>;

  readonly #multipleSimulation: () => Map<CCPinId, boolean[]> | null;

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

  constructor(props: CCComponentEditorRendererPortProps) {
    super(props.context);
    this.#nodeId = props.nodeId;
    this.#pinId = props.pinId;
    this.position = props.position;
    this.#simulation = props.simulation;
    this.#multipleSimulation = props.multipleSimulation;
    this.#pixiParentContainer = props.pixiParentContainer;
    this.#pixiContainer = new PIXI.Container();
    this.#pixiParentContainer.addChild(this.#pixiContainer);
    this.#pixiGraphics = new PIXI.Graphics();
    if (this.context.store.pins.get(this.#pinId)!.type === "input") {
      this.#pixiGraphics.interactive = true;
      this.#pixiGraphics.cursor = "pointer";
      this.#pixiGraphics.on("pointerdown", this.onClick);
    }
    this.#pixiContainer.addChild(this.#pixiGraphics);
    this.#pixiLabelTextBox = new CCComponentEditorRendererTextBox({
      context: this.context,
      pixiParentContainer: this.#pixiContainer,
    });
    this.#pixiLabelTextBox.onChange = (value) => {
      this.context.store.pins.update(this.#pinId, { name: value });
    };
    this.registerChildRenderer(this.#pixiLabelTextBox);
    this.#pixiLabelTextBox.fontSize =
      CCComponentEditorRendererPort.drawingConstants.fontSize;
    this.#pixiValueText = new PIXI.Text();
    this.#pixiValueText.style.fontSize =
      CCComponentEditorRendererPort.drawingConstants.fontSize;
    this.#pixiValueText.style.fill =
      CCComponentEditorRendererPort.drawingConstants.valueColor;
    this.#pixiValueText.anchor.set(0.5, 0.5);
    if (this.context.store.pins.get(this.#pinId)!.type === "input") {
      this.#pixiValueText.interactive = true;
      this.#pixiValueText.cursor = "pointer";
      this.#pixiValueText.on("pointerdown", this.onClick);
    }
    this.#pixiContainer.addChild(this.#pixiValueText);
    this.context.store.components.on("didUpdate", this.render);
    this.#unsubscribeComponentEditorStore =
      this.context.componentEditorStore.subscribe(this.render);
    this.#valueBoxWidth =
      CCComponentEditorRendererPort.drawingConstants.valueBoxWidthUnit;
    this.context.store.pins.on("didUpdate", (pin) => {
      if (pin.id === this.#pinId) this.render();
    });
    this.render();
  }

  onClick = (e: PIXI.FederatedPointerEvent) => {
    const editorState = this.context.componentEditorStore.getState();
    const previousValue = editorState.getInputValue(this.#nodeId, this.#pinId);
    editorState.setInputValue(this.#nodeId, this.#pinId, !previousValue);
    e.preventDefault();
  };

  render = () => {
    this.#pixiGraphics.clear();
    const editorState = this.context.componentEditorStore.getState();
    const pin = this.context.store.pins.get(this.#pinId)!;
    this.#pixiContainer.position = this.position;
    this.#pixiLabelTextBox.value = pin.name;
    const c = CCComponentEditorRendererPort.drawingConstants;
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
        this.#pixiValueText.text = editorState.getInputValue(
          this.#nodeId,
          this.#pinId
        )
          ? "1"
          : "0";
        this.#pixiGraphics.beginFill(activeColor);
      } else {
        // const output = this.#simulation();
        const multipleOutput = this.#multipleSimulation();
        // for (const [key, value] of output) {
        //   if (key === this.#pinId) {
        //     this.#pixiValueText.text = value ? "1" : "0";
        //   }
        // }
        if (multipleOutput) {
          const createValueText = (values: boolean[]) => {
            let valueText = "";
            for (let i = 0; i < values.length; i += 1) {
              valueText += values[i] ? "1" : "0";
            }
            return valueText;
          };
          for (const [key, values] of multipleOutput) {
            if (key === this.#pinId) {
              this.#pixiValueText.text = createValueText(values);
              this.#valueBoxWidth =
                c.valueBoxWidthUnit +
                ((values.length - 1) * c.valueBoxWidthUnit) / 4;
              break;
            }
          }
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

  override destroy() {
    this.#pixiParentContainer.removeChild(this.#pixiContainer);
    this.context.store.components.off("didUpdate", this.render);
    this.#unsubscribeComponentEditorStore();
    super.destroy();
  }
}
