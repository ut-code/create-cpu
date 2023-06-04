import * as PIXI from "pixi.js";
import invariant from "tiny-invariant";
import { IObservable, Observable } from "../common/observable";
import type { Perspective } from "../common/perspective";
import { sampleHalfAdder } from "../common/sampleComponent";
import type CCNode from "./node";
import CCGrid from "./grid";
import type { CCComponentId } from "../types";
import type CCStore from "./store";

export type CCCanvasRegistrationProps = {
  size: IObservable<PIXI.Point>;
  pixiContainer: PIXI.Container;
  onContextMenu(position: PIXI.Point): void;
};

type DragState = {
  startPosition: PIXI.Point;
  target:
    | { type: "world"; initialCenter: PIXI.Point }
    | { type: "node"; node: CCNode; initialPosition: PIXI.Point };
};

export type CCPin = {
  id: string;
  name: string;
};

/** Editor for CCComponent */
export default class CCComponent {
  readonly id: CCComponentId;

  name: string;

  inputPins: CCPin[] = [];

  outputPins: CCPin[] = [];

  #store: CCStore;

  #props?: CCCanvasRegistrationProps;

  #pixiCanvas: PIXI.Container;

  #pixiWorld: PIXI.Container;

  #ccGrid: CCGrid;

  #worldPerspective: Observable<Perspective> = new Observable({
    center: new PIXI.Point(0, 0),
    scale: 1.0,
  });

  #dragState: DragState | null = null;

  constructor(store: CCStore, name: string, isRoot?: boolean) {
    this.id = isRoot ? null : window.crypto.randomUUID();
    this.name = name;
    this.#store = store;
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
    this.registerNodes();
    props.size.observe(() => {
      this.#render();
    });
    props.pixiContainer.addChild(this.#pixiCanvas);
    this.#pixiCanvas.addChild(this.#pixiWorld);

    this.#pixiCanvas.on("pointerout", () => {
      this.#dragState = null;
    });

    // Support dragging
    this.#pixiCanvas.on("mousedown", (e) => {
      this.#dragState = {
        startPosition: e.global.clone(),
        target: {
          type: "world",
          initialCenter: this.worldPerspective.center,
        },
      };
      const ccNodes = this.#store.getCCNodes();
      for (const ccNode of ccNodes.values()) {
        ccNode.isSelected = false;
        ccNode.render();
      }
    });
    this.#pixiCanvas.on("mousemove", (e) => {
      if (this.#dragState) {
        const dragOffset = e.global
          .subtract(this.#dragState.startPosition)
          .multiplyScalar(1 / this.worldPerspective.scale);
        switch (this.#dragState.target.type) {
          case "world":
            if (e.ctrlKey) {
              this.worldPerspective = {
                center:
                  this.#dragState.target.initialCenter.subtract(dragOffset),
                scale: this.worldPerspective.scale,
              };
            }
            return;
          case "node":
            this.#dragState.target.node.position =
              this.#dragState.target.initialPosition.add(dragOffset);
            this.#dragState.target.node.render();
            // TODO: rendering connection
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

  #registeredNodeIds = new Set<string>();

  registerNodes() {
    const ccNodes = this.#store.getCCNodesInCCComponent(this.id);
    for (const ccNode of ccNodes) {
      if (!this.#registeredNodeIds.has(ccNode.id)) {
        this.#registeredNodeIds.add(ccNode.id);
        ccNode.register({
          pixiContainer: this.#pixiWorld,
          // eslint-disable-next-line no-loop-func
          onDragStart: (e) => {
            this.#dragState = {
              startPosition: e.global.clone(),
              target: {
                type: "node",
                node: ccNode,
                initialPosition: ccNode.position.clone(),
              },
            };
          },
          getComponent: () => sampleHalfAdder,
        });
      }
    }
  }

  #registeredConnectionIds = new Set<string>();

  registerConnections() {
    const ccConnections = this.#store.getCCConnectionsInCCComponent(this.id);
    for (const ccConnection of ccConnections) {
      if (!this.#registeredConnectionIds.has(ccConnection.id)) {
        this.#registeredConnectionIds.add(ccConnection.id);
        ccConnection.register({
          pixiContainer: this.#pixiWorld,
          getPinPosition: (endpoint) => {
            return this.#store
              .getCCNode(endpoint.nodeId)!
              .getPinPosition(endpoint.pinId);
          },
        });
      }
    }
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

  // addConnection(connection: CCConnection) {
  //   this.ccConnections.push(connection);
  //   connection.register({
  //     pixiContainer: this.#pixiWorld,
  //     getFromPosition: (e) =>
  //       this.getComponent(
  //         (this.getBlock(e.nodeId) as CCNode).ccComponentId as string
  //       ).getEdge(e.edgeId).position,
  //     getToPosition: (e) =>
  //       this.getComponent(
  //         (this.getBlock(e.nodeId) as CCNode).ccComponentId as string
  //       ).getEdge(e.edgeId).position,
  //   });
  // }

  destroy() {
    this.#pixiCanvas.removeChildren();
    this.#pixiWorld.removeChildren();
  }
}
