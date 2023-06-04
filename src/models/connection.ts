import * as PIXI from "pixi.js";
import invariant from "tiny-invariant";
import type { CCComponentId } from "../types";

export type CCConnectionEndpoint = {
  nodeId: string;
  pinId: string;
};

export type CCConnectionRegistrationProps = {
  pixiContainer: PIXI.Container;
  getPinPosition: (endpoint: CCConnectionEndpoint) => PIXI.Point;
};

const lineWidth = 2;
const lineColor = 0x000000;

export default class CCConnection {
  #pixiGraphics: {
    from: PIXI.Graphics;
    middle: PIXI.Graphics;
    to: PIXI.Graphics;
  };

  fromEndpoint: CCConnectionEndpoint;

  toEndpoint: CCConnectionEndpoint;

  #bentPortion: number;

  #props?: CCConnectionRegistrationProps;

  readonly id: string;

  parentComponentId: CCComponentId;

  constructor(
    fromEndPoint: CCConnectionEndpoint,
    toEndPoint: CCConnectionEndpoint,
    parentComponentId: CCComponentId
  ) {
    this.#pixiGraphics = {
      from: new PIXI.Graphics(),
      middle: new PIXI.Graphics(),
      to: new PIXI.Graphics(),
    };
    this.#pixiGraphics.from.lineStyle(lineWidth, lineColor);
    this.#pixiGraphics.middle.lineStyle(lineWidth, lineColor);
    this.#pixiGraphics.to.lineStyle(lineWidth, lineColor);
    this.fromEndpoint = fromEndPoint;
    this.toEndpoint = toEndPoint;
    this.#bentPortion = 0.5;
    this.id = window.crypto.randomUUID();
    this.parentComponentId = parentComponentId;
  }

  render() {
    invariant(this.#props);
    this.#pixiGraphics.from.clear();
    this.#pixiGraphics.middle.clear();
    this.#pixiGraphics.to.clear();
    this.#pixiGraphics.from.lineStyle(lineWidth, lineColor);
    this.#pixiGraphics.middle.lineStyle(lineWidth, lineColor);
    this.#pixiGraphics.to.lineStyle(lineWidth, lineColor);
    const fromPosition = this.#props.getPinPosition(this.fromEndpoint);
    const toPosition = this.#props.getPinPosition(this.toEndpoint);
    const diffX = toPosition.x - fromPosition.x;
    // const diffY = toPosition.y - fromPosition.y;
    this.#pixiGraphics.from.moveTo(fromPosition.x, fromPosition.y);
    this.#pixiGraphics.from.lineTo(
      fromPosition.x + this.#bentPortion * diffX,
      fromPosition.y
    );
    this.#pixiGraphics.middle.moveTo(
      fromPosition.x + this.#bentPortion * diffX,
      fromPosition.y
    );
    this.#pixiGraphics.middle.lineTo(
      fromPosition.x + this.#bentPortion * diffX,
      toPosition.y
    );
    this.#pixiGraphics.to.moveTo(
      fromPosition.x + this.#bentPortion * diffX,
      toPosition.y
    );
    this.#pixiGraphics.to.lineTo(toPosition.x, toPosition.y);
  }

  register(props: CCConnectionRegistrationProps) {
    props.pixiContainer.addChild(this.#pixiGraphics.from);
    props.pixiContainer.addChild(this.#pixiGraphics.middle);
    props.pixiContainer.addChild(this.#pixiGraphics.to);
    this.#props = props;
    this.render();
  }
}
