import * as PIXI from "pixi.js";

type CCConnectionEndpoint = {
  nodeId: string;
  edgeId: string;
};

export type CCConnectionRegistrationProps = {
  pixiContainer: PIXI.Container;
  fromPositionGetter: (fromEndpoint: CCConnectionEndpoint) => PIXI.Point;
  toPositionGetter: (toEndpoint: CCConnectionEndpoint) => PIXI.Point;
};

export default class CCConnection {
  #pixiGraphics: PIXI.Graphics;

  #fromEndpoint: CCConnectionEndpoint;

  #toEndpoint: CCConnectionEndpoint;

  fromPositionGetter: (fromEndpoint: CCConnectionEndpoint) => PIXI.Point;

  toPositionGetter: (toEndpoint: CCConnectionEndpoint) => PIXI.Point;

  constructor(
    fromEndPoint: CCConnectionEndpoint,
    toEndPoint: CCConnectionEndpoint,
    fromPosition: (fromEndpoint: CCConnectionEndpoint) => PIXI.Point,
    toPosition: (toEndpoint: CCConnectionEndpoint) => PIXI.Point
  ) {
    this.#pixiGraphics = new PIXI.Graphics();
    this.#pixiGraphics.lineStyle(2, 0x000000);
    this.#fromEndpoint = fromEndPoint;
    this.#toEndpoint = toEndPoint;
    this.fromPositionGetter = fromPosition;
    this.toPositionGetter = toPosition;
  }

  get fromPosition() {
    return this.fromPositionGetter(this.#fromEndpoint);
  }

  get toPosition() {
    return this.toPositionGetter(this.#toEndpoint);
  }

  render() {
    this.#pixiGraphics.moveTo(this.fromPosition.x, this.fromPosition.y);
    this.#pixiGraphics.lineTo(this.toPosition.x, this.toPosition.y);
  }

  register(props: CCConnectionRegistrationProps) {
    props.pixiContainer.addChild(this.#pixiGraphics);
    this.fromPositionGetter = props.fromPositionGetter;
    this.toPositionGetter = props.toPositionGetter;
    this.render();
  }
}
