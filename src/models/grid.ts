import * as PIXI from "pixi.js";
import invariant from "tiny-invariant";
import type { IObservable } from "../common/observable";
import { editorGridColor } from "../common/theme";
import type { Perspective } from "../common/perspective";

export type CCGridRegistrationProps = {
  canvasSize: IObservable<PIXI.Point>;
  worldPerspective: IObservable<Perspective>;
  pixiContainer: PIXI.Container;
};

export default class CCGrid {
  #props?: CCGridRegistrationProps;

  pixiGraphics: PIXI.Graphics;

  constructor() {
    this.pixiGraphics = new PIXI.Graphics();
  }

  register(props: CCGridRegistrationProps) {
    this.#props = props;
    props.pixiContainer.addChild(this.pixiGraphics);
    props.canvasSize.observe(() => {
      this.render();
    });
    props.worldPerspective.observe(() => {
      this.render();
    });
    this.render();
  }

  render() {
    invariant(this.#props);
    const minGridSize = 100; // maxGridSize = 200
    const logScale = Math.log2(this.#props.worldPerspective.value.scale);
    const gridSize = minGridSize * 2 ** (logScale - Math.floor(logScale));
    const canvasCenter =
      this.#props.worldPerspective.value.center.multiplyScalar(
        this.#props.worldPerspective.value.scale
      );

    this.pixiGraphics.clear();
    this.pixiGraphics.lineStyle({ color: editorGridColor, width: 1 });
    for (
      let x =
        -((canvasCenter.x - this.#props.canvasSize.value.x / 2) % gridSize) -
        gridSize;
      x < this.#props.canvasSize.value.x;
      x += gridSize
    )
      this.pixiGraphics.moveTo(x, 0).lineTo(x, this.#props.canvasSize.value.y);
    for (
      let y =
        -((canvasCenter.y - this.#props.canvasSize.value.y / 2) % gridSize) -
        gridSize;
      y < this.#props.canvasSize.value.y;
      y += gridSize
    )
      this.pixiGraphics.moveTo(0, y).lineTo(this.#props.canvasSize.value.x, y);
  }
}
