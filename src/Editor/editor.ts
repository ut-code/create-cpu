import * as PIXI from "pixi.js";
import "@pixi/math-extras";
import { EventEmitter } from "eventemitter3";
import {
  blackColor,
  editorBackgroundColor,
  editorGridColor,
  primaryColor,
  whiteColor,
} from "../common/theme";

export class CCApplication extends EventEmitter<{
  resize: (size: PIXI.Point) => void;
  canvasContextMenu: (position: PIXI.Point) => void;
}> {
  htmlContainer: HTMLDivElement;
  htmlCanvas: HTMLCanvasElement;
  size: PIXI.Point;
  pixiApplication: PIXI.Application;
  ccCanvas: CCCanvas;
  resizeObserver: ResizeObserver;

  constructor(htmlContainer: HTMLDivElement, htmlCanvas: HTMLCanvasElement) {
    super();
    this.htmlContainer = htmlContainer;
    this.htmlCanvas = htmlCanvas;

    const rect = this.htmlContainer.getBoundingClientRect();
    this.size = new PIXI.Point(rect.width, rect.height);
    this.resizeObserver = new ResizeObserver(([entry]) => {
      const contentRect = entry?.contentRect;
      if (!contentRect) return;
      this.size = new PIXI.Point(contentRect.width, contentRect.height);
      this.emit("resize", this.size);
    });
    this.resizeObserver.observe(this.htmlContainer);

    this.pixiApplication = new PIXI.Application({
      view: this.htmlCanvas,
      resizeTo: this.htmlContainer,
      background: editorBackgroundColor,
      resolution: window.devicePixelRatio,
      autoDensity: true,
    });
    this.ccCanvas = new CCCanvas(this);
  }
}

export class CCCanvas {
  ccApplication: CCApplication;
  pixiContainer: PIXI.Container;
  pixiEditorContainer: PIXI.Container;

  ccGrid: CCGrid;

  constructor(ccApplication: CCApplication) {
    this.ccApplication = ccApplication;
    this.pixiContainer = new PIXI.Container();
    this.ccGrid = new CCGrid(this);
    this.ccApplication.pixiApplication.stage.addChild(this.pixiContainer);
    this.pixiEditorContainer = new PIXI.Container();
    this.pixiContainer.addChild(this.pixiEditorContainer);
    this.center = new PIXI.Point(0, 0);

    this.pixiContainer.interactive = true;
    this.pixiContainer.hitArea = { contains: () => true };

    // Rerender when the viewport is resized
    this.ccApplication.on("resize", () => {
      this.resize();
    });

    // Support dragging
    let initialCenter: PIXI.Point | null = null;
    let dragStartScreenOffset: PIXI.Point | null = null;
    this.pixiContainer.on("mousedown", (e) => {
      initialCenter = this.center;
      dragStartScreenOffset = e.global.clone();
    });
    this.pixiContainer.on("mousemove", (e) => {
      if (dragStartScreenOffset && initialCenter) {
        this.center = initialCenter.add(
          dragStartScreenOffset
            .subtract(e.global)
            .multiplyScalar(1 / this.scale)
        );
      }
    });
    this.pixiContainer.on("mouseup", () => {
      dragStartScreenOffset = null;
    });

    // Support zooming
    this.pixiContainer.on("wheel", (e) => {
      this.zoom(e.global, 0.999 ** e.deltaY);
    });

    // Context menu
    this.pixiContainer.on("rightclick", (e) => {
      this.ccApplication.emit("canvasContextMenu", e.global.clone());
      e.preventDefault();
    });
  }

  // View state
  #center: PIXI.Point = new PIXI.Point(0, 0);
  #scale: number = 1;
  private resize() {
    this.pixiEditorContainer.position = this.ccApplication.size
      .multiplyScalar(0.5)
      .subtract(this.#center.multiplyScalar(this.scale));
    this.pixiEditorContainer.scale = { x: this.#scale, y: this.#scale };
    this.ccGrid.render();
  }
  get center(): PIXI.Point {
    return this.#center;
  }
  set center(value: PIXI.IPointData) {
    this.#center = new PIXI.Point(value.x, value.y);
    this.resize();
  }
  get scale(): number {
    return this.#scale;
  }
  set scale(value: number) {
    this.#scale = value;
    this.resize();
  }
  zoom(zoomCenter: PIXI.IPointData, factor: number) {
    const localZoomCenter = this.pixiEditorContainer.toLocal(zoomCenter);
    this.center = this.center
      .subtract(localZoomCenter)
      .multiplyScalar(1 / factor)
      .add(localZoomCenter);
    this.scale *= factor;
  }

  addChild(child: CCBlock) {
    this.pixiEditorContainer.addChild(child.pixiGraphics);
    child.ccCanvas = this;
  }
}

export class CCGrid {
  ccCanvas: CCCanvas;
  pixiGraphics: PIXI.Graphics;

  constructor(ccCanvas: CCCanvas) {
    this.ccCanvas = ccCanvas;
    this.pixiGraphics = new PIXI.Graphics();
    this.ccCanvas.pixiContainer.addChild(this.pixiGraphics);

    // Rerender when the viewport is resized
    this.ccCanvas.ccApplication.on("resize", () => {
      this.render();
    });
    this.render();
  }

  render() {
    const minGridSize = 100; // maxGridSize = 100 * e
    const logCanvasScale = Math.log(this.ccCanvas.scale);
    const gridSize =
      minGridSize * Math.exp(logCanvasScale - Math.floor(logCanvasScale));
    const realCenter = this.ccCanvas.center.multiplyScalar(this.ccCanvas.scale);

    this.pixiGraphics.clear();
    this.pixiGraphics.lineStyle({ color: editorGridColor, width: 1 });
    const canvasSize = this.ccCanvas.ccApplication.size;
    for (
      let x = -((realCenter.x - canvasSize.x / 2) % gridSize) - gridSize;
      x < canvasSize.x;
      x += gridSize
    )
      this.pixiGraphics.moveTo(x, 0).lineTo(x, canvasSize.y);
    for (
      let y = -((realCenter.y - canvasSize.y / 2) % gridSize) - gridSize;
      y < canvasSize.y;
      y += gridSize
    )
      this.pixiGraphics.moveTo(0, y).lineTo(canvasSize.x, y);
  }
}

export class CCBlock {
  ccCanvas?: CCCanvas;
  pixiGraphics: PIXI.Graphics;

  #position: PIXI.Point;
  #size = new PIXI.Point(100, 100);
  #isSelected = false;

  constructor(position: PIXI.IPointData) {
    this.#position = new PIXI.Point(position.x, position.y);
    this.pixiGraphics = new PIXI.Graphics();
    this.pixiGraphics.interactive = true;

    let initialPosition: { block: PIXI.Point; pointer: PIXI.Point } | null =
      null;
    this.pixiGraphics.on("mousedown", (e) => {
      this.#isSelected = true;
      initialPosition = { block: this.#position, pointer: e.global.clone() };
      this.render();
      e.stopPropagation();
    });
    this.pixiGraphics.on("mousemove", (e) => {
      if (!initialPosition || !this.ccCanvas) return;
      this.#position = initialPosition.block.add(
        e.global
          .subtract(initialPosition.pointer)
          .multiplyScalar(1 / this.ccCanvas.scale)
      );
      this.render();
    });
    this.pixiGraphics.on("mouseup", () => {
      initialPosition = null;
    });
    this.render();
  }

  render() {
    const borderWidth = 5;
    const outlineWidth = 3;
    this.pixiGraphics.clear();
    this.pixiGraphics.beginFill(whiteColor);
    this.pixiGraphics.lineStyle({
      color: blackColor,
      width: borderWidth,
      alignment: 1,
    });
    this.pixiGraphics.drawRect(
      this.#position.x - this.#size.x / 2,
      this.#position.y - this.#size.y / 2,
      this.#size.x,
      this.#size.y
    );
    this.pixiGraphics.endFill();
    if (this.#isSelected) {
      this.pixiGraphics.lineStyle({
        color: primaryColor,
        width: outlineWidth,
        alignment: 1,
      });
      this.pixiGraphics.drawRect(
        this.#position.x - this.#size.x / 2 - borderWidth,
        this.#position.y - this.#size.y / 2 - borderWidth,
        this.#size.x + borderWidth * 2,
        this.#size.y + borderWidth * 2
      );
    }
  }
}
