import * as PIXI from "pixi.js";
import { blackColor, primaryColor, whiteColor } from "../common/theme";
import type { CCBlockRegistrationProps } from "./block";

export type CCAndRegistrationProps = CCBlockRegistrationProps;

export default class CCAnd {
  #pixiGraphics: PIXI.Graphics;

  #position: PIXI.Point;

  #size = new PIXI.Point(70, 100);

  #wireLength = 30;

  #wirePositionFromEdge = 25;

  #isSelected = false;

  constructor(position: PIXI.IPointData) {
    this.#position = new PIXI.Point(position.x, position.y);
    this.#pixiGraphics = new PIXI.Graphics();
    this.#pixiGraphics.interactive = true;
  }

  register(props: CCAndRegistrationProps) {
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
    const radius = this.#size.y / 2;
    const rectangleLeftTop = {
      x: this.#position.x - this.#size.x / 2,
      y: this.#position.y - this.#size.y / 2,
    };
    const rectangleLeftBottom = {
      x: this.#position.x - this.#size.x / 2,
      y: this.#position.y + this.#size.y / 2,
    };
    const rectangleRightTop = {
      x: this.#position.x + this.#size.x / 2,
      y: this.#position.y - this.#size.y / 2,
    };
    this.#pixiGraphics.clear();
    this.#pixiGraphics.beginFill(whiteColor);
    this.#pixiGraphics.drawRect(
      rectangleLeftTop.x,
      rectangleLeftTop.y,
      this.#size.x,
      this.#size.y
    );
    this.#pixiGraphics.drawCircle(
      this.#position.x + this.#size.x / 2,
      this.#position.y,
      radius
    );
    this.#pixiGraphics.endFill();
    this.#pixiGraphics.lineStyle({
      color: blackColor,
      width: borderWidth,
      alignment: 1,
    });
    this.#pixiGraphics.moveTo(rectangleLeftTop.x, rectangleLeftTop.y);
    this.#pixiGraphics.lineTo(rectangleRightTop.x, rectangleRightTop.y);
    this.#pixiGraphics.arc(
      this.#position.x + this.#size.x / 2,
      this.#position.y,
      radius,
      -Math.PI / 2,
      Math.PI / 2
    );
    this.#pixiGraphics.lineTo(rectangleLeftBottom.x, rectangleLeftBottom.y);
    this.#pixiGraphics.lineTo(
      rectangleLeftTop.x,
      rectangleLeftTop.y - borderWidth
    );
    this.#pixiGraphics.moveTo(
      rectangleLeftBottom.x,
      rectangleLeftBottom.y - this.#wirePositionFromEdge
    );
    this.#pixiGraphics.lineTo(
      rectangleLeftBottom.x - this.#wireLength,
      rectangleLeftBottom.y - this.#wirePositionFromEdge
    );
    this.#pixiGraphics.moveTo(
      rectangleLeftTop.x,
      rectangleLeftTop.y + this.#wirePositionFromEdge
    );
    this.#pixiGraphics.lineTo(
      rectangleLeftTop.x - this.#wireLength,
      rectangleLeftTop.y + this.#wirePositionFromEdge
    );
    this.#pixiGraphics.moveTo(
      this.#position.x + this.#size.x / 2 + radius,
      this.#position.y
    );
    this.#pixiGraphics.lineTo(
      this.#position.x + this.#size.x / 2 + radius + this.#wireLength,
      this.#position.y
    );
    if (this.#isSelected) {
      this.#pixiGraphics.lineStyle({
        color: primaryColor,
        width: outlineWidth,
        alignment: 1,
      });
      this.#pixiGraphics.moveTo(
        rectangleLeftTop.x - borderWidth,
        rectangleLeftTop.y - borderWidth
      );
      this.#pixiGraphics.lineTo(
        rectangleRightTop.x,
        rectangleRightTop.y - borderWidth
      );
      this.#pixiGraphics.arc(
        this.#position.x + this.#size.x / 2,
        this.#position.y,
        this.#size.y / 2 + borderWidth,
        -Math.PI / 2,
        Math.PI / 2
      );
      this.#pixiGraphics.lineTo(
        rectangleLeftBottom.x - borderWidth,
        rectangleLeftBottom.y + borderWidth
      );
      this.#pixiGraphics.lineTo(
        rectangleLeftTop.x - borderWidth,
        rectangleLeftTop.y - borderWidth - outlineWidth
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
