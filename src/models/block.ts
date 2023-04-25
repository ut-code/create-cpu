import type { Point } from "pixi.js";
import * as PIXI from "pixi.js";
import {
  blackColor,
  grayColor,
  primaryColor,
  whiteColor,
} from "../common/theme";
import type {
  CCComponentDefinition,
  CCSequentialCircuitIdentifier,
} from "../types";

export type CCBlockRegistrationProps = {
  pixiContainer: PIXI.Container;
  onDragStart(e: PIXI.FederatedMouseEvent): void;
  componentDefinitionGetter: (componentId: string) => CCComponentDefinition;
};

type CCNodeConstructorProps = {
  component: CCComponentDefinition;
  id: string;
  position: Point;
  sequentialCircuitIdentifier?: CCSequentialCircuitIdentifier;
};

type PixiTexts = {
  componentName: PIXI.Text;
  edgesName: Map<string, PIXI.Text>;
};

export default class CCNode {
  // #props?: CCBlockRegistrationProps;

  #pixiGraphics: PIXI.Graphics;

  #position: PIXI.Point;

  readonly id: string;

  readonly componentId: string;

  #size = new PIXI.Point(200, 100);

  #componentNameFontSize = 24;

  #edgenameFontSize = 16;

  #isSelected = false;

  #pixiTexts: PixiTexts;

  #componentDefinition: CCComponentDefinition;

  readonly sequentialCircuitIdentifier?: CCSequentialCircuitIdentifier;

  constructor({
    component,
    id,
    position,
    sequentialCircuitIdentifier,
  }: CCNodeConstructorProps) {
    this.#position = new PIXI.Point(position.x, position.y);
    if (sequentialCircuitIdentifier) {
      this.sequentialCircuitIdentifier = sequentialCircuitIdentifier;
    }
    this.id = id;
    this.componentId = component.id;
    this.#pixiGraphics = new PIXI.Graphics();
    this.#pixiGraphics.interactive = true;
    this.#componentDefinition = component;
    this.#pixiTexts = this.#generateString();
  }

  #generateString(): {
    componentName: PIXI.Text;
    edgesName: Map<string, PIXI.Text>;
  } {
    const component = this.#componentDefinition;
    const componentName = new PIXI.Text(this.#componentDefinition.name, {
      fontSize: this.#componentNameFontSize,
    });
    const map = new Map<string, PIXI.Text>();
    for (const edge of component.inputEdges) {
      map.set(
        edge.id,
        new PIXI.Text(edge.name, { fontSize: this.#edgenameFontSize })
      );
    }
    for (const edge of component.outputEdges) {
      map.set(
        edge.id,
        new PIXI.Text(edge.name, {
          fontSize: this.#edgenameFontSize,
        })
      );
    }
    return { componentName, edgesName: map };
  }

  register(props: CCBlockRegistrationProps) {
    // this.#props = props;
    this.#componentDefinition = props.componentDefinitionGetter(
      this.componentId
    );
    this.#pixiTexts = this.#generateString();
    props.pixiContainer.addChild(this.#pixiGraphics);
    props.pixiContainer.addChild(this.#pixiTexts.componentName);
    this.#pixiTexts.edgesName.forEach((value) =>
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
    const gap = 6;
    const edgeSize = 10;
    this.#componentDefinition.inputEdges.forEach((edge, index) => {
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
      const edgeName = this.#pixiTexts.edgesName.get(edge.id);
      if (edgeName) {
        edgeName.x = position.x + edgeSize + gap;
        edgeName.y = position.y;
        edgeName.anchor.set(0, 0.25);
      }
    });
    const outputEdgeGap =
      this.#size.y / (this.#componentDefinition.outputEdges.length + 1);
    this.#componentDefinition.outputEdges.forEach((edge, index) => {
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
      const edgeName = this.#pixiTexts.edgesName.get(edge.id);
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
          this.#componentNameFontSize -
          margin,
        this.#size.x + borderWidth * 3 + edgeSize,
        this.#size.y +
          this.#componentNameFontSize +
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
}
