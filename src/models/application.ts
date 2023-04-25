import * as PIXI from "pixi.js";
import { editorBackgroundColor } from "../common/theme";
import CCCanvas from "./canvas";
import { Observable } from "../common/observable";

export default class CCApplication {
  ccCanvas: CCCanvas;

  #htmlContainer: HTMLDivElement;

  #htmlCanvas: HTMLCanvasElement;

  #canvasSize: Observable<PIXI.Point>;

  #pixiApplication: PIXI.Application;

  #resizeObserver: ResizeObserver;

  constructor(
    htmlContainer: HTMLDivElement,
    htmlCanvas: HTMLCanvasElement,
    onContextMenu: (position: PIXI.Point) => void
  ) {
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
    this.ccCanvas = new CCCanvas();
    this.ccCanvas.register({
      size: this.#canvasSize,
      onContextMenu: (position) => {
        onContextMenu(position);
      },
      pixiContainer: this.#pixiApplication.stage,
    });
  }

  destroy() {
    this.ccCanvas.destroy();
  }
}
