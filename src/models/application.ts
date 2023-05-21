import * as PIXI from "pixi.js";
import { editorBackgroundColor } from "../common/theme";
import { Observable } from "../common/observable";
import type CCStore from "./store";

export default class CCApplication {
  #store: CCStore;

  #htmlContainer: HTMLDivElement;

  #htmlCanvas: HTMLCanvasElement;

  #canvasSize: Observable<PIXI.Point>;

  #pixiApplication: PIXI.Application;

  #resizeObserver: ResizeObserver;

  constructor(
    store: CCStore,
    htmlContainer: HTMLDivElement,
    htmlCanvas: HTMLCanvasElement,
    onContextMenu: (position: PIXI.Point) => void
  ) {
    this.#store = store;
    this.#htmlContainer = htmlContainer;
    this.#htmlCanvas = htmlCanvas;

    const rect = this.#htmlContainer.getBoundingClientRect();
    this.#canvasSize = new Observable(new PIXI.Point(rect.width, rect.height));
    this.#resizeObserver = new ResizeObserver(([entry]) => {
      const contentRect = entry?.contentRect;
      if (!contentRect) return;
      this.#canvasSize.value = new PIXI.Point(
        contentRect.width,
        contentRect.height
      );
    });
    this.#resizeObserver.observe(this.#htmlContainer);

    this.#pixiApplication = new PIXI.Application({
      view: this.#htmlCanvas,
      resizeTo: this.#htmlContainer,
      background: editorBackgroundColor,
      resolution: window.devicePixelRatio,
      autoDensity: true,
    });
    this.#store.getComponent(null).register({
      size: this.#canvasSize,
      onContextMenu: (position) => {
        onContextMenu(position);
      },
      pixiContainer: this.#pixiApplication.stage,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  destroy() {
    // this.ccCanvas.destroy();
  }
}
