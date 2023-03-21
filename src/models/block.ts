import * as PIXI from "pixi.js";
import { blackColor, primaryColor, whiteColor } from "../common/theme";

export type CCBlockRegistrationProps = {
  pixiContainer: PIXI.Container;
  onDragStart(e: PIXI.FederatedMouseEvent): void;
};

export default class CCBlock {
  // #props?: CCBlockRegistrationProps;

  #pixiGraphics: PIXI.Graphics;

  #position: PIXI.Point;

  #size = new PIXI.Point(100, 100);

  #isSelected = false;

  constructor(position: PIXI.IPointData) {
    this.#position = new PIXI.Point(position.x, position.y);
    this.#pixiGraphics = new PIXI.Graphics();
    this.#pixiGraphics.interactive = true;
  }

  register(props: CCBlockRegistrationProps) {
    // this.#props = props;
    props.pixiContainer.addChild(this.#pixiGraphics);
    this.#pixiGraphics.on("mousedown", (e) => {
      this.isSelected = true;
      props.onDragStart(e);
      e.stopPropagation();
    });
    this.render();
  }

  private render() {
    const borderWidth = 5;
    const outlineWidth = 3;
    this.#pixiGraphics.clear();
    this.#pixiGraphics.beginFill(whiteColor);
    this.#pixiGraphics.lineStyle({
      color: blackColor,
      width: borderWidth,
      alignment: 1,
    });
    this.#pixiGraphics.drawRect(
      this.#position.x - this.#size.x / 2,
      this.#position.y - this.#size.y / 2,
      this.#size.x,
      this.#size.y
    );
    this.#pixiGraphics.endFill();
    if (this.#isSelected) {
      this.#pixiGraphics.lineStyle({
        color: primaryColor,
        width: outlineWidth,
        alignment: 1,
      });
      this.#pixiGraphics.drawRect(
        this.#position.x - this.#size.x / 2 - borderWidth,
        this.#position.y - this.#size.y / 2 - borderWidth,
        this.#size.x + borderWidth * 2,
        this.#size.y + borderWidth * 2
      );
    }
  }

  get isSelected() {
    return this.#isSelected;
  }

  set isSelected(value) {
    this.#isSelected = value;
    this.render();
  }

  get position() {
    return this.#position;
  }

  set position(value) {
    this.#position = value;
    this.render();
  }
}
