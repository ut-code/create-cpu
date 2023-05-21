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
  #pixiGraphics: {
    from: PIXI.Graphics;
    middle: PIXI.Graphics;
    to: PIXI.Graphics;
  };

  #fromEndpoint: CCConnectionEndpoint;

  #toEndpoint: CCConnectionEndpoint;

  #bentPortion: number;

  fromPositionGetter: (fromEndpoint: CCConnectionEndpoint) => PIXI.Point;

  toPositionGetter: (toEndpoint: CCConnectionEndpoint) => PIXI.Point;

  constructor(
    fromEndPoint: CCConnectionEndpoint,
    toEndPoint: CCConnectionEndpoint,
    fromPosition: (fromEndpoint: CCConnectionEndpoint) => PIXI.Point,
    toPosition: (toEndpoint: CCConnectionEndpoint) => PIXI.Point
  ) {
    this.#pixiGraphics = {
      from: new PIXI.Graphics(),
      middle: new PIXI.Graphics(),
      to: new PIXI.Graphics(),
    };
    this.#pixiGraphics.from.lineStyle(2, 0x000000);
    this.#pixiGraphics.middle.lineStyle(2, 0x000000);
    this.#pixiGraphics.to.lineStyle(2, 0x000000);
    this.#fromEndpoint = fromEndPoint;
    this.#toEndpoint = toEndPoint;
    this.fromPositionGetter = fromPosition;
    this.toPositionGetter = toPosition;
    this.#bentPortion = 0.5;
  }

  get fromPosition() {
    return this.fromPositionGetter(this.#fromEndpoint);
  }

  get toPosition() {
    return this.toPositionGetter(this.#toEndpoint);
  }

  render() {
    const diffX = this.toPosition.x - this.fromPosition.x;
    const diffY = this.toPosition.y - this.fromPosition.y;
    this.#pixiGraphics.from.moveTo(this.fromPosition.x, this.fromPosition.y);
    this.#pixiGraphics.from.lineTo(
      this.fromPosition.x + this.#bentPortion * diffX,
      this.fromPosition.y + this.#bentPortion * diffY
    );
    this.#pixiGraphics.middle.moveTo(
      this.fromPosition.x + this.#bentPortion * diffX,
      this.fromPosition.y + this.#bentPortion * diffY
    );
    this.#pixiGraphics.middle.lineTo(
      this.fromPosition.x + this.#bentPortion * diffX,
      this.toPosition.y
    );
    this.#pixiGraphics.to.moveTo(
      this.fromPosition.x + this.#bentPortion * diffX,
      this.toPosition.y
    );
    this.#pixiGraphics.to.lineTo(this.toPosition.x, this.toPosition.y);
  }

  register(props: CCConnectionRegistrationProps) {
    props.pixiContainer.addChild(this.#pixiGraphics.from);
    props.pixiContainer.addChild(this.#pixiGraphics.middle);
    props.pixiContainer.addChild(this.#pixiGraphics.to);
    this.fromPositionGetter = props.fromPositionGetter;
    this.toPositionGetter = props.toPositionGetter;
    this.render();
  }
}
