import * as PIXI from "pixi.js";
import { Point } from "pixi.js";
import { blackColor, primaryColor, whiteColor } from "../common/theme";

export type CCBlockRegistrationProps = {
  pixiContainer: PIXI.Container;
  onDragStart(e: PIXI.FederatedMouseEvent): void;
};

export type BlockType = "And" | "Custom" | "Not";

export default class CCBlock {
  // #props?: CCBlockRegistrationProps;

  #pixiGraphics: PIXI.Graphics;

  #position: PIXI.Point;

  #wireLength = 30;

  #size = new PIXI.Point(100, 100);

  #isSelected = false;

  constructor(position: PIXI.IPointData, public blockType: BlockType) {
    this.#position = new PIXI.Point(position.x, position.y);
    this.#pixiGraphics = new PIXI.Graphics();
    this.#pixiGraphics.interactive = true;
    if (blockType === "Custom" || blockType === "Not") {
      this.#size = new PIXI.Point(100, 100);
    } else if (blockType === "And") {
      this.#size = new PIXI.Point(70, 100);
    }
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
    switch (this.blockType) {
      case "Custom": {
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
        break;
      }
      case "And": {
        const radius = this.#size.y / 2;
        const wirePositionFromEdge = 25;
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
          rectangleLeftBottom.y - wirePositionFromEdge
        );
        this.#pixiGraphics.lineTo(
          rectangleLeftBottom.x - this.#wireLength,
          rectangleLeftBottom.y - wirePositionFromEdge
        );
        this.#pixiGraphics.moveTo(
          rectangleLeftTop.x,
          rectangleLeftTop.y + wirePositionFromEdge
        );
        this.#pixiGraphics.lineTo(
          rectangleLeftTop.x - this.#wireLength,
          rectangleLeftTop.y + wirePositionFromEdge
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
        break;
      }
      case "Not": {
        this.#pixiGraphics.beginFill(whiteColor);
        this.#pixiGraphics.lineStyle({
          color: blackColor,
          width: borderWidth,
          alignment: 1,
        });
        this.#pixiGraphics.drawPolygon(
          new PIXI.Polygon(
            new Point(
              this.#position.x - this.#size.x / 2,
              this.#position.y - this.#size.y / 2
            ),
            new Point(
              this.#position.x - this.#size.x / 2,
              this.#position.y + this.#size.y / 2
            ),
            new Point(this.#position.x + this.#size.x / 2, this.#position.y)
          )
        );
        const radius = 6;
        this.#pixiGraphics.drawCircle(
          this.#position.x + this.#size.x / 2 + radius + borderWidth,
          this.#position.y,
          radius
        );
        this.#pixiGraphics.endFill();
        this.#pixiGraphics.moveTo(
          this.#position.x - this.#size.x / 2,
          this.#position.y - borderWidth / 2
        );
        this.#pixiGraphics.lineTo(
          this.#position.x - this.#size.x / 2 - this.#wireLength,
          this.#position.y - borderWidth / 2
        );
        this.#pixiGraphics.moveTo(
          this.#position.x + this.#size.x / 2 + radius * 2 + borderWidth,
          this.#position.y + borderWidth / 2
        );
        this.#pixiGraphics.lineTo(
          this.#position.x +
            this.#size.x / 2 +
            radius * 2 +
            borderWidth +
            this.#wireLength,
          this.#position.y + borderWidth / 2
        );
        if (this.isSelected) {
          this.#pixiGraphics.lineStyle({
            color: primaryColor,
            width: outlineWidth,
            alignment: 1,
          });
          this.#pixiGraphics.drawPolygon(
            new PIXI.Polygon(
              new Point(
                this.#position.x - this.#size.x / 2,
                this.#position.y - this.#size.y / 2
              ),
              new Point(
                this.#position.x - this.#size.x / 2,
                this.#position.y + this.#size.y / 2
              ),
              new Point(this.#position.x + this.#size.x / 2, this.#position.y)
            )
          );
        }
        break;
      }
      default: {
        break;
      }
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
