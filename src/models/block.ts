import * as PIXI from "pixi.js";
import { blackColor, primaryColor, whiteColor } from "../common/theme";
import type { CCComponentDefinition } from "../types";

export type CCBlockRegistrationProps = {
  pixiContainer: PIXI.Container;
  onDragStart(e: PIXI.FederatedMouseEvent): void;
};

type PixiTexts = {
  componentName: PIXI.Text;
};

export default class CCBlock {
  // #props?: CCBlockRegistrationProps;

  #pixiGraphics: PIXI.Graphics;

  #position: PIXI.Point;

  #size = new PIXI.Point(100, 100);

  #isSelected = false;

  #pixiTexts: PixiTexts;

  #componentDefinition: CCComponentDefinition;

  constructor(position: PIXI.IPointData, component: CCComponentDefinition) {
    this.#position = new PIXI.Point(position.x, position.y);
    this.#pixiGraphics = new PIXI.Graphics();
    this.#pixiGraphics.interactive = true;
    this.#componentDefinition = component;
    const componentName = new PIXI.Text(this.#componentDefinition.name, {
      fontSize: 24,
    });
    this.#pixiTexts = { componentName };
  }

  register(props: CCBlockRegistrationProps) {
    // this.#props = props;
    props.pixiContainer.addChild(this.#pixiGraphics);
    props.pixiContainer.addChild(this.#pixiTexts.componentName);
    this.#pixiGraphics.on("mousedown", (e) => {
      this.isSelected = true;
      props.onDragStart(e);
      e.stopPropagation();
    });
    this.render();
  }

  private render() {
    const borderWidth = 3;
    const outlineWidth = 1;
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
    const inputEdgeGap =
      this.#size.y / (this.#componentDefinition.inputEdges.length + 1);
    const edgeSize = 10;
    this.#componentDefinition.inputEdges.forEach((edge, index) => {
      this.#pixiGraphics.drawRoundedRect(
        this.#position.x - this.#size.x / 2 - edgeSize / 2,
        this.#position.y -
          this.#size.y / 2 +
          inputEdgeGap * (index + 1) -
          edgeSize / 2,
        edgeSize,
        edgeSize,
        2
      );
    });
    const outputEdgeGap =
      this.#size.y / (this.#componentDefinition.outputEdges.length + 1);
    this.#componentDefinition.outputEdges.forEach((edge, index) => {
      this.#pixiGraphics.drawRoundedRect(
        this.#position.x + this.#size.x / 2 - edgeSize / 2,
        this.#position.y -
          this.#size.y / 2 +
          outputEdgeGap * (index + 1) -
          edgeSize / 2,
        edgeSize,
        edgeSize,
        2
      );
    });
    this.#pixiGraphics.endFill();
    this.#pixiTexts.componentName.x = this.#position.x - this.#size.x / 2;
    const gap = 4;
    this.#pixiTexts.componentName.y =
      this.#position.y -
      this.#size.y / 2 -
      Number(this.#pixiTexts.componentName.style.fontSize) -
      gap;
    if (this.#isSelected) {
      this.#pixiGraphics.lineStyle({
        color: primaryColor,
        width: outlineWidth,
        alignment: 1,
      });
      this.#pixiGraphics.drawRect(
        this.#position.x - this.#size.x / 2 - borderWidth / 2,
        this.#position.y - this.#size.y / 2 - borderWidth / 2,
        this.#size.x + borderWidth,
        this.#size.y + borderWidth
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
