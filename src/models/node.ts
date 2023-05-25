import type { Point } from "pixi.js";
import * as PIXI from "pixi.js";
import {
  blackColor,
  grayColor,
  primaryColor,
  whiteColor,
} from "../common/theme";
import type { CCComponent, CCComponentId } from "../types";
import type CCStore from "./store";

export type CCNodeConstructorProps = {
  store: CCStore;
  componentId: CCComponentId;
  parentComponentId: CCComponentId;
  position: Point;
};

export type CCNodeRegistrationProps = {
  pixiContainer: PIXI.Container;
  onDragStart(e: PIXI.FederatedMouseEvent): void;
  getComponent: (componentId: CCComponentId) => CCComponent;
};

type PixiTexts = {
  componentName: PIXI.Text;
  edgeNames: Map<string, PIXI.Text>;
};

export default class CCNode {
  // #props?: CCBlockRegistrationProps;

  readonly ccComponentId: CCComponentId;

  parentComponentId: CCComponentId;

  #store: CCStore;

  #pixiGraphics: PIXI.Graphics;

  #position: PIXI.Point;

  readonly id: string;

  #size = new PIXI.Point(200, 100);

  static readonly #componentNameFontSize = 24;

  static readonly #edgeNameFontSize = 16;

  #isSelected = false;

  #pixiTexts: PixiTexts;

  constructor({
    store,
    componentId,
    parentComponentId,
    position,
  }: CCNodeConstructorProps) {
    this.#store = store;
    this.#position = new PIXI.Point(position.x, position.y);
    this.id = window.crypto.randomUUID();
    this.ccComponentId = componentId;
    this.parentComponentId = parentComponentId;
    this.#pixiGraphics = new PIXI.Graphics();
    this.#pixiGraphics.interactive = true;
    this.#pixiTexts = this.#createText();
  }

  #createText(): {
    componentName: PIXI.Text;
    edgeNames: Map<string, PIXI.Text>;
  } {
    const component = this.#store.getComponent(this.ccComponentId)!;
    const componentName = new PIXI.Text(component.name, {
      fontSize: CCNode.#componentNameFontSize,
    });
    const map = new Map<string, PIXI.Text>();
    for (const edge of component.inputEdges) {
      map.set(
        edge.id,
        new PIXI.Text(edge.name, { fontSize: CCNode.#edgeNameFontSize })
      );
    }
    for (const edge of component.outputEdges) {
      map.set(
        edge.id,
        new PIXI.Text(edge.name, {
          fontSize: CCNode.#edgeNameFontSize,
        })
      );
    }
    return { componentName, edgeNames: map };
  }

  register(props: CCNodeRegistrationProps) {
    // this.#props = props;
    this.#pixiTexts = this.#createText();
    props.pixiContainer.addChild(this.#pixiGraphics);
    props.pixiContainer.addChild(this.#pixiTexts.componentName);
    this.#pixiTexts.edgeNames.forEach((value) =>
      props.pixiContainer.addChild(value)
    );
    this.#pixiGraphics.on("mousedown", (e) => {
      this.isSelected = true;
      props.onDragStart(e);
      e.stopPropagation();
    });
    this.render();
  }

  private render() {
    const component = this.#store.getComponent(this.ccComponentId)!;
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
    const inputEdgeGap = this.#size.y / (component.inputEdges.length + 1);
    const gap = 6;
    const edgeSize = 10;
    component.inputEdges.forEach((edge, index) => {
      const position = {
        x: this.#position.x - this.#size.x / 2 - edgeSize / 2 - borderWidth / 2,
        y:
          this.#position.y -
          this.#size.y / 2 +
          inputEdgeGap * (index + 1) -
          edgeSize / 2,
      };
      this.#pixiGraphics.drawRoundedRect(
        position.x,
        position.y,
        edgeSize,
        edgeSize,
        2
      );
      const edgeName = this.#pixiTexts.edgeNames.get(edge.id);
      if (edgeName) {
        edgeName.x = position.x + edgeSize + gap;
        edgeName.y = position.y;
        edgeName.anchor.set(0, 0.25);
      }
    });
    const outputEdgeGap = this.#size.y / (component.outputEdges.length + 1);
    component.outputEdges.forEach((edge, index) => {
      const position = {
        x: this.#position.x + this.#size.x / 2 - edgeSize / 2 + borderWidth / 2,
        y:
          this.#position.y -
          this.#size.y / 2 +
          outputEdgeGap * (index + 1) -
          edgeSize / 2,
      };
      this.#pixiGraphics.drawRoundedRect(
        position.x,
        position.y,
        edgeSize,
        edgeSize,
        2
      );
      const edgeName = this.#pixiTexts.edgeNames.get(edge.id);
      if (edgeName) {
        edgeName.x = position.x - gap;
        edgeName.y = position.y;
        edgeName.anchor.set(1, 0.25);
      }
    });
    this.#pixiGraphics.endFill();
    this.#pixiGraphics.beginFill(grayColor);
    this.#pixiGraphics.endFill();
    this.#pixiTexts.componentName.anchor.set(0, 1);
    this.#pixiTexts.componentName.x = this.#position.x - this.#size.x / 2;
    this.#pixiTexts.componentName.y = this.#position.y - this.#size.y / 2 - gap;
    if (this.#isSelected) {
      this.#pixiGraphics.lineStyle({
        color: primaryColor,
        width: outlineWidth,
        alignment: 1,
      });
      const margin = 8;
      this.#pixiGraphics.drawRect(
        this.#position.x - this.#size.x / 2 - borderWidth * 1.5 - edgeSize / 2,
        this.#position.y -
          this.#size.y / 2 -
          CCNode.#componentNameFontSize -
          margin,
        this.#size.x + borderWidth * 3 + edgeSize,
        this.#size.y +
          CCNode.#componentNameFontSize +
          margin +
          borderWidth / 2 -
          outlineWidth / 2
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

  destroy() {
    this.#pixiGraphics.destroy();
    this.#pixiTexts.componentName.destroy();
    for (const text of this.#pixiTexts.edgeNames) {
      text[1].destroy();
    }
  }
}
