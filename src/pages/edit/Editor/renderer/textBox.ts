import * as PIXI from "pixi.js";
import CCComponentEditorRendererBase, {
  type CCComponentEditorRendererContext,
} from "./base";

export type CCComponentEditorRendererTextBoxProps = {
  context: CCComponentEditorRendererContext;
  pixiParentContainer: PIXI.Container;
  isEditable: boolean;
};

export class CCComponentEditorRendererTextBox extends CCComponentEditorRendererBase {
  #unsubscribeComponentEditorStore: () => void;

  #pixiParentContainer: PIXI.Container;

  #pixiText: PIXI.Text;

  #isInEditMode = false;

  #htmlInput: HTMLInputElement | null = null;

  value = "";

  position: PIXI.Point;

  fontSize = 16;

  alignment: "left" | "center" | "right" = "left";

  constructor(props: CCComponentEditorRendererTextBoxProps) {
    super(props.context);
    this.#unsubscribeComponentEditorStore =
      this.context.componentEditorStore.subscribe(() => this.render());
    this.#pixiParentContainer = props.pixiParentContainer;
    this.#pixiText = new PIXI.Text();
    this.#pixiParentContainer.addChild(this.#pixiText);
    this.position = new PIXI.Point(0, 0);
    this.render();
  }

  render() {
    this.#pixiText.position = this.position;
    this.#pixiText.text = this.value;
    if (this.alignment === "left") {
      this.#pixiText.anchor.set(0, 0.5);
    } else if (this.alignment === "center") {
      this.#pixiText.anchor.set(0.5, 0.5);
    } else if (this.alignment === "right") {
      this.#pixiText.anchor.set(1, 0.5);
    }
    this.#pixiText.style.fontSize = this.fontSize;
    this.#pixiText.visible = !this.#isInEditMode;
    if (this.#isInEditMode) {
      const htmlInput = this.activateHtmlInput();
      htmlInput.style.textAlign = this.alignment;
    } else {
      this.deactivateHtmlInput();
    }
  }

  activateHtmlInput() {
    if (this.#htmlInput) return this.#htmlInput;
    this.#htmlInput = window.document.createElement("input");
    this.context.overlayArea.appendChild(this.#htmlInput);
    this.#htmlInput.style.position = "absolute";
    this.#htmlInput.style.padding = "0";
    this.#htmlInput.style.border = "none";
    this.#htmlInput.style.outline = "none";
    this.#htmlInput.style.background = "none";
    this.#htmlInput.style.pointerEvents = "auto";
    this.#htmlInput.addEventListener("change", () => {
      this.render();
    });
    this.#htmlInput.addEventListener("keydown", () => {
      this.render();
    });
    this.#htmlInput.addEventListener("keyup", () => {
      this.render();
    });
    this.#htmlInput.addEventListener("change", () => {
      this.render();
    });
    this.#htmlInput.addEventListener("blur", () => {
      this.#isInEditMode = false;
      this.render();
    });
    return this.#htmlInput;
  }

  deactivateHtmlInput() {
    if (!this.#htmlInput) return;
    this.context.overlayArea.removeChild(this.#htmlInput);
    this.#htmlInput = null;
  }

  override destroy() {
    super.destroy();
    this.deactivateHtmlInput();
    this.#unsubscribeComponentEditorStore();
  }
}
