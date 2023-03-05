import * as PIXI from "pixi.js";
import "@pixi/math-extras";

export class CCApplication {
  htmlCanvas: HTMLCanvasElement;
  pixiApplication: PIXI.Application;
  ccCanvas: CCCanvas;

  constructor(htmlCanvas: HTMLCanvasElement) {
    this.htmlCanvas = htmlCanvas;
    this.pixiApplication = new PIXI.Application({
      view: this.htmlCanvas,
      resizeTo: window,
      background: 0xf3f3f3,
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

    // Support dragging
    let initialCenter: PIXI.Point | null = null;
    let dragStartScreenOffset: PIXI.Point | null = null;
    this.ccApplication.htmlCanvas.addEventListener("pointerdown", (e) => {
      initialCenter = this.center;
      dragStartScreenOffset = new PIXI.Point(e.offsetX, e.offsetY);
    });
    this.ccApplication.htmlCanvas.addEventListener("pointermove", (e) => {
      if (dragStartScreenOffset && initialCenter) {
        this.center = initialCenter.add(
          dragStartScreenOffset
            .subtract(new PIXI.Point(e.offsetX, e.offsetY))
            .multiplyScalar(1 / this.scale)
        );
      }
    });
    this.ccApplication.htmlCanvas.addEventListener("pointerup", () => {
      dragStartScreenOffset = null;
    });

    // Support zooming
    this.ccApplication.htmlCanvas.addEventListener("wheel", (e) => {
      this.zoom({ x: e.offsetX, y: e.offsetY }, 0.999 ** e.deltaY);
    });

    // Rerender when the viewport is resized
    window.addEventListener("resize", () => {
      this.resize();
    });
  }

  // View state
  #center: PIXI.Point = new PIXI.Point(0, 0);
  #scale: number = 1;
  private resize() {
    this.pixiEditorContainer.position = new PIXI.Point(
      window.innerWidth,
      window.innerHeight
    )
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
    window.addEventListener("resize", () => {
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
    this.pixiGraphics.lineStyle({ color: 0xdddddd, width: 1 });
    for (
      let x = -((realCenter.x - window.innerWidth / 2) % gridSize) - gridSize;
      x < window.innerWidth;
      x += gridSize
    )
      this.pixiGraphics.moveTo(x, 0).lineTo(x, window.innerHeight);
    for (
      let y = -((realCenter.y - window.innerHeight / 2) % gridSize) - gridSize;
      y < window.innerHeight;
      y += gridSize
    )
      this.pixiGraphics.moveTo(0, y).lineTo(window.innerWidth, y);
  }
}

export class CCBlock {
  pixiGraphics: PIXI.Graphics;

  constructor() {
    this.pixiGraphics = new PIXI.Graphics();
    this.pixiGraphics.lineStyle({ color: 0x000000, width: 5 });
    this.pixiGraphics.drawRect(-50, -50, 100, 100);
  }
}
