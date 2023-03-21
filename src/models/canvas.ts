import * as PIXI from "pixi.js";
import invariant from "tiny-invariant";
import { IObservable, Observable } from "../common/observable";
import type { Perspective } from "../common/perspective";
import type CCBlock from "./block";
import CCGrid from "./grid";

export type CCCanvasRegistrationProps = {
  size: IObservable<PIXI.Point>;
  pixiContainer: PIXI.Container;
  onContextMenu(position: PIXI.Point): void;
};

type DragState = {
  startPosition: PIXI.Point;
  target:
    | { type: "world"; initialCenter: PIXI.Point }
    | { type: "block"; block: CCBlock; initialPosition: PIXI.Point };
};

export default class CCCanvas {
  ccBlocks: CCBlock[] = [];

  #props?: CCCanvasRegistrationProps;

  #pixiCanvas: PIXI.Container;

  #pixiWorld: PIXI.Container;

  #ccGrid: CCGrid;

  #worldPerspective: Observable<Perspective> = new Observable({
    center: new PIXI.Point(0, 0),
    scale: 1.0,
  });

  #dragState: DragState | null = null;

  constructor() {
    this.#pixiCanvas = new PIXI.Container();
    this.#pixiCanvas.interactive = true;
    this.#pixiCanvas.hitArea = { contains: () => true }; // Capture events everywhere
    this.#pixiWorld = new PIXI.Container();
    this.#ccGrid = new CCGrid();
  }

  register(props: CCCanvasRegistrationProps) {
    this.#props = props;
    this.#ccGrid.register({
      canvasSize: props.size,
      worldPerspective: this.#worldPerspective,
      pixiContainer: this.#pixiCanvas,
    });
    props.size.observe(() => {
      this.#render();
    });
    props.pixiContainer.addChild(this.#pixiCanvas);
    this.#pixiCanvas.addChild(this.#pixiWorld);

    // Support dragging
    this.#pixiCanvas.on("mousedown", (e) => {
      this.#dragState = {
        startPosition: e.global.clone(),
        target: {
          type: "world",
          initialCenter: this.worldPerspective.center,
        },
      };
    });
    this.#pixiCanvas.on("mousemove", (e) => {
      if (this.#dragState) {
        const dragOffset = e.global
          .subtract(this.#dragState.startPosition)
          .multiplyScalar(1 / this.worldPerspective.scale);
        switch (this.#dragState.target.type) {
          case "world":
            this.worldPerspective = {
              center: this.#dragState.target.initialCenter.subtract(dragOffset),
              scale: this.worldPerspective.scale,
            };
            return;
          case "block":
            this.#dragState.target.block.position =
              this.#dragState.target.initialPosition.add(dragOffset);
            return;
          default:
            throw new Error(
              `Unexpected drag target: ${
                this.#dragState.target satisfies never
              }`
            );
        }
      }
    });
    this.#pixiCanvas.on("mouseup", () => {
      this.#dragState = null;
    });

    // Support zooming
    this.#pixiCanvas.on("wheel", (e) => {
      this.zoom(this.toWorldPosition(e.global), 0.999 ** e.deltaY);
    });

    // Context menu
    this.#pixiCanvas.on("rightclick", (e) => {
      props.onContextMenu(e.global.clone());
      e.preventDefault();
    });
  }

  #render() {
    invariant(this.#props);
    this.#pixiWorld.position = this.toCanvasPosition(new PIXI.Point(0, 0));
    this.#pixiWorld.scale = {
      x: this.worldPerspective.scale,
      y: this.worldPerspective.scale,
    };
  }

  get worldPerspective() {
    return this.#worldPerspective.value;
  }

  set worldPerspective(value) {
    this.#worldPerspective.value = value;
    this.#render();
  }

  toCanvasPosition(worldPosition: PIXI.Point) {
    invariant(this.#props);
    return worldPosition
      .subtract(this.worldPerspective.center)
      .multiplyScalar(this.worldPerspective.scale)
      .add(this.#props.size.value.multiplyScalar(0.5));
  }

  toWorldPosition(canvasPosition: PIXI.Point) {
    invariant(this.#props);
    return canvasPosition
      .subtract(this.#props.size.value.multiplyScalar(0.5))
      .multiplyScalar(1 / this.worldPerspective.scale)
      .add(this.worldPerspective.center);
  }

  zoom(zoomCenter: PIXI.Point, factor: number) {
    const newCenter = this.worldPerspective.center
      .subtract(zoomCenter)
      .multiplyScalar(1 / factor)
      .add(zoomCenter);
    const newScale = this.worldPerspective.scale * factor;
    this.worldPerspective = {
      center: newCenter,
      scale: newScale,
    };
  }

  addBlock(block: CCBlock) {
    invariant(this.#props);
    this.ccBlocks.push(block);
    block.register({
      pixiContainer: this.#pixiWorld,
      onDragStart: (e) => {
        this.#dragState = {
          startPosition: e.global.clone(),
          target: {
            type: "block",
            block,
            initialPosition: block.position.clone(),
          },
        };
      },
    });
  }
}
