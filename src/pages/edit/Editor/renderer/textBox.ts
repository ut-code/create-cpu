import * as PIXI from "pixi.js";
import CCComponentEditorRendererBase, {
  type CCComponentEditorRendererContext,
} from "./base";

export type CCComponentEditorRendererTextBoxProps = {
  context: CCComponentEditorRendererContext;
  pixiParentContainer: PIXI.Container;
};

/**
 * Class for rendering text box
 */
export class CCComponentEditorRendererTextBox extends CCComponentEditorRendererBase {
  #unsubscribeComponentEditorStore: () => void;

  readonly #pixiParentContainer: PIXI.Container;

  readonly #pixiText: PIXI.Text;

  #isInEditMode = false;

  #htmlInput: HTMLInputElement | null = null;

  value = "";

  position: PIXI.Point;

  fontSize = 16;

  alignment: "left" | "center" | "right" = "left";

  isEditable = false;

  onChange?: (value: string) => void;

  /**
   * Constructor of CCComponentEditorRendererTextBox
   * @param props
   */
  constructor(props: CCComponentEditorRendererTextBoxProps) {
    super(props.context);
    this.#unsubscribeComponentEditorStore =
      this.context.componentEditorStore.subscribe(() => this.render());
    this.#pixiParentContainer = props.pixiParentContainer;
    this.#pixiText = new PIXI.Text();
    this.#pixiText.on("pointerdown", () => {
      if (!this.isEditable) return;
      this.#isInEditMode = true;
      this.render();
    });
    this.#pixiParentContainer.addChild(this.#pixiText);
    this.position = new PIXI.Point(0, 0);
    this.render();
  }

  /**
   * Render text box
   */
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
    if (this.isEditable) {
      // this.#pixiText.interactive = true;
      this.#pixiText.eventMode = "dynamic";
    } else {
      // this.#pixiText.interactive = false;
      this.#pixiText.eventMode = "none";
    }
    if (this.#isInEditMode) {
      const htmlInput = this.activateHtmlInput();
      htmlInput.style.textAlign = this.alignment;
      const t = this.#pixiText.worldTransform;
      htmlInput.style.transform = `matrix(${t.a}, ${t.b}, ${t.c}, ${t.d}, ${t.tx}, ${t.ty})`;
    } else {
      this.deactivateHtmlInput();
    }
  }

  /**
   * Activate HTML input element and return it
   * @returns HTML input element
   */
  activateHtmlInput() {
    if (this.#htmlInput) return this.#htmlInput;
    this.#htmlInput = window.document.createElement("input");
    this.#htmlInput.value = this.value;
    this.#htmlInput.style.position = "absolute";
    this.#htmlInput.style.padding = "0";
    this.#htmlInput.style.border = "none";
    this.#htmlInput.style.outline = "none";
    this.#htmlInput.style.background = "none";
    this.#htmlInput.style.pointerEvents = "auto";
    this.#htmlInput.style.fontSize = `${this.fontSize}px`;
    this.#htmlInput.style.translate = [
      {
        left: "0",
        center: "-50%",
        right: "-100%",
      }[this.alignment],
      "-50%",
    ].join(" ");
    this.#htmlInput.addEventListener("blur", () => {
      this.#isInEditMode = false;
      if (this.#htmlInput && this.onChange)
        this.onChange(this.#htmlInput.value);
      this.render();
    });
    this.context.overlayArea.appendChild(this.#htmlInput);
    // Focus after other event handlers have finished processing.
    setTimeout(() => {
      this.#htmlInput?.focus();
      this.#htmlInput?.select();
    }, 10);
    return this.#htmlInput;
  }

  /**
   * Deactivate HTML input element
   */
  deactivateHtmlInput() {
    if (!this.#htmlInput) return;
    this.context.overlayArea.removeChild(this.#htmlInput);
    this.#htmlInput = null;
  }

  /**
   * Destroy the text box
   */
  override destroy() {
    super.destroy();
    this.deactivateHtmlInput();
    this.#unsubscribeComponentEditorStore();
  }
}
