import * as PIXI from "pixi.js";
import invariant from "tiny-invariant";
import { editorBackgroundColor } from "../../../common/theme";
import { Observable } from "../../../common/observable";
import type CCStore from "../../../store";
import type { CCComponentId } from "../../../store/component";
import type { CCNode, CCNodeId } from "../../../store/node";
import CCComponentEditorRendererNode from "./node";
import type { Perspective } from "../../../common/perspective";
import type { CCConnection, CCConnectionId } from "../../../store/connection";
import CCComponentEditorRendererConnection from "./connection";

type DragState = {
  startPosition: PIXI.Point;
  target:
    | { type: "world"; initialCenter: PIXI.Point }
    | { type: "node"; nodeId: CCNodeId; initialPosition: PIXI.Point };
};

export default class CCComponentEditorRenderer {
  #store: CCStore;

  #componentId: CCComponentId;

  #htmlContainer: HTMLDivElement;

  #htmlCanvas: HTMLCanvasElement;

  #canvasSize: Observable<PIXI.Point>;

  #pixiApplication: PIXI.Application;

  #pixiWorld: PIXI.Container;

  #nodeRenderers = new Map<CCNodeId, CCComponentEditorRendererNode>();

  #connectionRenderers = new Map<
    CCConnectionId,
    CCComponentEditorRendererConnection
  >();

  // #gridRenderer = null;

  #worldPerspective: Observable<Perspective> = new Observable({
    center: new PIXI.Point(0, 0),
    scale: 1.0,
  });

  #dragState: DragState | null = null;

  #resizeObserver: ResizeObserver;

  constructor(
    store: CCStore,
    componentId: CCComponentId,
    htmlContainer: HTMLDivElement,
    htmlCanvas: HTMLCanvasElement,
    onContextMenu: (position: PIXI.Point) => void
  ) {
    this.#store = store;
    this.#componentId = componentId;
    this.#htmlContainer = htmlContainer;
    this.#htmlCanvas = htmlCanvas;
    invariant(this.#store.components.get(componentId));

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
    this.#pixiWorld = new PIXI.Container();
    this.#pixiApplication.stage.addChild(this.#pixiWorld);
    this.#pixiApplication.stage.interactive = true;
    this.#pixiApplication.stage.hitArea = { contains: () => true }; // Capture events everywhere
    this.#pixiApplication.stage.on("mousedown", (e) => {
      this.#dragState = {
        startPosition: e.global.clone(),
        target: {
          type: "world",
          initialCenter: this.#worldPerspective.value.center,
        },
      };
      for (const ccNodeRenderer of this.#nodeRenderers.values()) {
        ccNodeRenderer.isSelected = false;
        ccNodeRenderer.render();
      }
    });
    this.#pixiApplication.stage.on("mousemove", (e) => {
      if (!this.#dragState) return;
      const dragOffset = e.global
        .subtract(this.#dragState.startPosition)
        .multiplyScalar(1 / this.#worldPerspective.value.scale);
      switch (this.#dragState.target.type) {
        case "world":
          if (e.ctrlKey) {
            this.#worldPerspective.value = {
              center: this.#dragState.target.initialCenter.subtract(dragOffset),
              scale: this.#worldPerspective.value.scale,
            };
          }
          return;
        case "node": {
          this.#store.nodes.update(this.#dragState.target.nodeId, {
            position: this.#dragState.target.initialPosition.add(dragOffset),
          });
          return;
        }
        default:
          throw new Error(
            `Unexpected drag target: ${this.#dragState.target satisfies never}`
          );
      }
    });
    this.#pixiApplication.stage.on("mouseup", () => {
      this.#dragState = null;
    });

    this.#store.nodes
      .getNodeIdsByParentComponentId(this.#componentId)
      .forEach((nodeId) => this.#addNodeRenderer(nodeId));
    store.nodes.on("didRegister", this.#onNodeAdded);
    store.nodes.on("didUnregister", this.#onNodeRemoved);

    this.#store.connections
      .getConnectionIdsByParentComponentId(this.#componentId)
      .forEach((connectionId) => this.#addConnectionRenderer(connectionId));
    store.connections.on("didRegister", this.#onConnectionAdded);
    store.connections.on("didUnregister", this.#onConnectionRemoved);

    // Support zooming
    this.#pixiApplication.stage.on("wheel", (e) => {
      this.#zoom(this.#toWorldPosition(e.global), 0.999 ** e.deltaY);
    });

    // Context menu
    this.#pixiApplication.stage.on("rightclick", (e) => {
      onContextMenu(e.global.clone());
      e.preventDefault();
    });

    this.#worldPerspective.observe(this.#render);
    this.#render();
  }

  #addNodeRenderer(nodeId: CCNodeId) {
    if (this.#nodeRenderers.has(nodeId)) return;
    const onDragStart = (e: PIXI.FederatedMouseEvent) => {
      const node = this.#store.nodes.get(nodeId)!;
      this.#dragState = {
        startPosition: e.global.clone(),
        target: {
          type: "node",
          nodeId,
          initialPosition: node.position.clone(),
        },
      };
    };
    const newNodeRenderer = new CCComponentEditorRendererNode({
      store: this.#store,
      nodeId,
      pixiParentContainer: this.#pixiWorld,
      onDragStart,
    });
    newNodeRenderer.onMouseDown((e) => {
      newNodeRenderer.isSelected = true;
      for (const [ccNodeId, nodeRenderer] of this.#nodeRenderers.entries()) {
        if (ccNodeId !== nodeId) {
          nodeRenderer.isSelected = false;
          nodeRenderer.render();
        }
      }
      onDragStart(e);
      e.stopPropagation();
      newNodeRenderer.render();
    });
    this.#nodeRenderers.set(nodeId, newNodeRenderer);
  }

  #addConnectionRenderer(connectionId: CCConnectionId) {
    const newConnectionRenderer = new CCComponentEditorRendererConnection(
      this.#store,
      connectionId,
      this.#pixiWorld
    );
    this.#connectionRenderers.set(connectionId, newConnectionRenderer);
  }

  #onConnectionAdded = (connection: CCConnection) => {
    if (connection.parentComponentId !== this.#componentId) return;
    this.#addConnectionRenderer(connection.id);
  };

  #onConnectionRemoved = (connection: CCConnection) => {
    if (connection.parentComponentId !== this.#componentId) return;
    this.#connectionRenderers.get(connection.id)?.destroy();
  };

  #onNodeAdded = (node: CCNode) => {
    if (node.parentComponentId !== this.#componentId) return;
    this.#addNodeRenderer(node.id);
  };

  #onNodeRemoved = (node: CCNode) => {
    if (node.parentComponentId !== this.#componentId) return;
    this.#nodeRenderers.get(node.id)?.destroy();
  };

  #toWorldPosition(canvasPosition: PIXI.Point) {
    return canvasPosition
      .subtract(this.#canvasSize.value.multiplyScalar(0.5))
      .multiplyScalar(1 / this.#worldPerspective.value.scale)
      .add(this.#worldPerspective.value.center);
  }

  #toCanvasPosition(worldPosition: PIXI.Point) {
    return worldPosition
      .subtract(this.#worldPerspective.value.center)
      .multiplyScalar(this.#worldPerspective.value.scale)
      .add(this.#canvasSize.value.multiplyScalar(0.5));
  }

  #zoom(zoomCenter: PIXI.Point, factor: number) {
    const newCenter = this.#worldPerspective.value.center
      .subtract(zoomCenter)
      .multiplyScalar(1 / factor)
      .add(zoomCenter);
    const newScale = this.#worldPerspective.value.scale * factor;
    this.#worldPerspective.value = {
      center: newCenter,
      scale: newScale,
    };
  }

  #render = () => {
    this.#pixiWorld.position = this.#toCanvasPosition(new PIXI.Point(0, 0));
    this.#pixiWorld.scale = {
      x: this.#worldPerspective.value.scale,
      y: this.#worldPerspective.value.scale,
    };
  };

  // eslint-disable-next-line class-methods-use-this
  destroy() {
    this.#store.nodes.off("didRegister", this.#onNodeAdded);
    this.#store.nodes.off("didUnregister", this.#onNodeRemoved);
    for (const renderer of this.#nodeRenderers.values()) renderer.destroy();
    // this.ccCanvas.destroy();
  }
}
