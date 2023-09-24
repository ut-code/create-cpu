import * as PIXI from "pixi.js";
import invariant from "tiny-invariant";
import { editorBackgroundColor } from "../../../common/theme";
import type CCStore from "../../../store";
import type { CCComponentId } from "../../../store/component";
import type { CCNode, CCNodeId } from "../../../store/node";
import CCComponentEditorRendererNode from "./node";
import {
  CCConnectionStore,
  type CCConnection,
  type CCConnectionId,
} from "../../../store/connection";
import CCComponentEditorRendererConnection from "./connection";
import CCComponentEditorRendererRangeSelect from "./rangeSelect";
import type { CCPinId } from "../../../store/pin";
import type { ComponentEditorStore } from "../store";
import CCSimulator from "./simulator";

type DragState = {
  startPosition: PIXI.Point;
  target:
    | { type: "world"; initialCenter: PIXI.Point }
    | {
        type: "node";
        nodeId: CCNodeId;
        initialPosition: Map<CCNodeId, PIXI.Point>;
      }
    | {
        type: "pin";
        pinId: CCPinId;
        nodeId: CCNodeId;
        initialPosition: PIXI.Point;
      }
    | { type: "rangeSelect"; initialPosition: PIXI.Point }
    | {
        type: "connection";
        connectionId: CCConnectionId;
        initialPosition: PIXI.Point;
      };
};

export type CCComponentEditorRendererProps = {
  store: CCStore;
  componentEditorStore: ComponentEditorStore;
  componentId: CCComponentId;
  htmlContainer: HTMLDivElement;
  onContextMenu: (position: PIXI.Point) => void;
};

export default class CCComponentEditorRenderer {
  #store: CCStore;

  #componentEditorStore: ComponentEditorStore;

  #unsubscribeComponentEditorStore: () => void;

  #componentId: CCComponentId;

  #htmlContainer: HTMLDivElement;

  #pixiApplication: PIXI.Application;

  #pixiWorld: PIXI.Container;

  #nodeRenderers = new Map<CCNodeId, CCComponentEditorRendererNode>();

  #connectionRenderers = new Map<
    CCConnectionId,
    CCComponentEditorRendererConnection
  >();

  #rangeSelectRenderer: CCComponentEditorRendererRangeSelect;

  // #gridRenderer = null;

  #dragState: DragState | null = null;

  #resizeObserver: ResizeObserver;

  #creatingConnectionPixiGraphics: PIXI.Graphics;

  #simulator: CCSimulator;

  constructor(props: CCComponentEditorRendererProps) {
    this.#store = props.store;
    this.#componentEditorStore = props.componentEditorStore;
    this.#componentId = props.componentId;
    this.#htmlContainer = props.htmlContainer;
    this.#simulator = new CCSimulator({
      store: this.#store,
      componentEditorStore: this.#componentEditorStore,
      componentId: this.#componentId,
    });
    invariant(this.#store.components.get(props.componentId));

    const rect = this.#htmlContainer.getBoundingClientRect();
    this.#componentEditorStore
      .getState()
      .setCanvasSize(new PIXI.Point(rect.width, rect.height));
    this.#resizeObserver = new ResizeObserver(([entry]) => {
      const contentRect = entry?.contentRect;
      if (!contentRect) return;
      this.#componentEditorStore
        .getState()
        .setCanvasSize(new PIXI.Point(contentRect.width, contentRect.height));
    });
    this.#resizeObserver.observe(this.#htmlContainer);

    this.#pixiApplication = new PIXI.Application({
      resizeTo: this.#htmlContainer,
      background: editorBackgroundColor,
      resolution: window.devicePixelRatio,
      autoDensity: true,
      antialias: true,
    });
    this.#htmlContainer.appendChild(
      this.#pixiApplication.view as HTMLCanvasElement
    );
    this.#pixiWorld = new PIXI.Container();
    this.#creatingConnectionPixiGraphics = new PIXI.Graphics();
    this.#pixiWorld.addChild(this.#creatingConnectionPixiGraphics);
    this.#rangeSelectRenderer = new CCComponentEditorRendererRangeSelect({
      store: this.#store,
      componentEditorStore: this.#componentEditorStore,
      pixiParentContainer: this.#pixiWorld,
    });
    this.#pixiApplication.stage.addChild(this.#pixiWorld);
    this.#pixiApplication.stage.interactive = true;
    this.#pixiApplication.stage.hitArea = { contains: () => true }; // Capture events everywhere
    this.#pixiApplication.stage.on("pointerdown", (e) => {
      const { worldPerspective, toWorldPosition } =
        this.#componentEditorStore.getState();
      if (e.button === 2) {
        this.#dragState = {
          startPosition: e.global.clone(),
          target: {
            type: "world",
            initialCenter: worldPerspective.center,
          },
        };
      } else if (e.button === 0) {
        const position = toWorldPosition(e.global.clone());
        this.#componentEditorStore
          .getState()
          .setRangeSelect({ start: position, end: position });
        this.#dragState = {
          startPosition: e.global.clone(),
          target: {
            type: "rangeSelect",
            initialPosition: position,
          },
        };
        this.#rangeSelectRenderer.render();
      }
      this.#componentEditorStore.getState().selectNode([], true);
    });
    this.#pixiApplication.stage.on("pointermove", (e) => {
      if (!this.#dragState) return;
      const { worldPerspective, setWorldPerspective } =
        this.#componentEditorStore.getState();
      const dragOffset = e.global
        .subtract(this.#dragState.startPosition)
        .multiplyScalar(1 / worldPerspective.scale);
      switch (this.#dragState.target.type) {
        case "world":
          setWorldPerspective({
            center: this.#dragState.target.initialCenter.subtract(dragOffset),
            scale: worldPerspective.scale,
          });
          return;
        case "node": {
          for (const nodeId of this.#componentEditorStore.getState()
            .selectedNodeIds) {
            const initialPosition = this.#dragState.target.initialPosition.get(
              nodeId as CCNodeId
            )!;
            this.#store.nodes.update(nodeId as CCNodeId, {
              position: initialPosition.add(dragOffset),
            });
          }
          return;
        }
        case "pin": {
          this.#creatingConnectionPixiGraphics.clear();
          this.#creatingConnectionPixiGraphics.lineStyle(2, 0x696969);
          const fromPosition = this.#dragState.target.initialPosition;
          const toPosition = fromPosition.add(dragOffset);
          this.#creatingConnectionPixiGraphics.moveTo(
            fromPosition.x,
            fromPosition.y
          );
          const diffX = toPosition.x - fromPosition.x;
          this.#creatingConnectionPixiGraphics.lineTo(
            fromPosition.x + 0.5 * diffX,
            fromPosition.y
          );
          this.#creatingConnectionPixiGraphics.lineTo(
            fromPosition.x + 0.5 * diffX,
            toPosition.y
          );
          this.#creatingConnectionPixiGraphics.lineTo(
            toPosition.x,
            toPosition.y
          );
          return;
        }
        case "rangeSelect": {
          const start = this.#dragState.target.initialPosition;
          const end = this.#dragState.target.initialPosition.add(dragOffset);
          this.#componentEditorStore.getState().setRangeSelect({
            start,
            end,
          });
          this.#rangeSelectRenderer.render();

          for (const nodeRenderer of this.#nodeRenderers.values()) {
            nodeRenderer.judgeIsRangeSelected(start, end);
          }
          return;
        }
        case "connection": {
          const fromPosition = this.#dragState.target.initialPosition;
          const toPosition = fromPosition.add(dragOffset);
          const offset = toPosition.x - fromPosition.x;
          const connectionRenderer = this.#connectionRenderers.get(
            this.#dragState.target.connectionId
          );
          connectionRenderer?.updateBentPortion(offset);
          return;
        }
        default:
          throw new Error(
            `Unexpected drag target: ${this.#dragState.target satisfies never}`
          );
      }
    });
    this.#pixiApplication.stage.on("pointerup", () => {
      if (this.#dragState?.target.type === "connection") {
        const connectionRenderer = this.#connectionRenderers.get(
          this.#dragState.target.connectionId
        )!;
        connectionRenderer.onDragEnd();
      }
      this.#dragState = null;
      this.#componentEditorStore.getState().setRangeSelect(null);
      if (this.#creatingConnectionPixiGraphics != null) {
        this.#creatingConnectionPixiGraphics.clear();
      }
      this.#rangeSelectRenderer.render();
    });

    this.#pixiApplication.stage.on("pointerleave", () => {
      this.#dragState = null;
      this.#componentEditorStore.getState().setRangeSelect(null);
      this.#rangeSelectRenderer.render();
    });

    this.#store.nodes
      .getNodeIdsByParentComponentId(this.#componentId)
      .forEach((nodeId) => this.#addNodeRenderer(nodeId));
    props.store.nodes.on("didRegister", this.#onNodeAdded);
    props.store.nodes.on("didUnregister", this.#onNodeRemoved);

    this.#store.connections
      .getConnectionIdsByParentComponentId(this.#componentId)
      .forEach((connectionId) => this.#addConnectionRenderer(connectionId));
    props.store.connections.on("didRegister", this.#onConnectionAdded);
    props.store.connections.on("didUnregister", this.#onConnectionRemoved);

    // Support zooming
    this.#pixiApplication.stage.on("wheel", (e) => {
      const { zoom, toWorldPosition } = this.#componentEditorStore.getState();
      zoom(toWorldPosition(e.global), 0.999 ** e.deltaY);
    });

    // Context menu
    this.#pixiApplication.stage.on("rightclick", (e) => {
      props.onContextMenu(e.global.clone());
      e.preventDefault();
    });

    this.#unsubscribeComponentEditorStore =
      this.#componentEditorStore.subscribe(this.#render);
    this.#render();
  }

  #addNodeRenderer(nodeId: CCNodeId) {
    if (this.#nodeRenderers.has(nodeId)) return;
    const onDragStart = (e: PIXI.FederatedMouseEvent) => {
      const { selectedNodeIds } = this.#componentEditorStore.getState();
      const initialPosition = new Map<CCNodeId, PIXI.Point>();
      for (const selectedNodeId of selectedNodeIds) {
        const selectedNode = this.#store.nodes.get(selectedNodeId)!;
        initialPosition.set(selectedNodeId, selectedNode.position.clone());
      }
      this.#dragState = {
        startPosition: e.global.clone(),
        target: {
          type: "node",
          nodeId,
          initialPosition,
        },
      };
    };
    const onDragStartPin = (e: PIXI.FederatedMouseEvent, pinId: CCPinId) => {
      // const node = this.#store.nodes.get(nodeId)!;
      const lineWidth = 2;
      const lineColor = 0x000000;
      // this.#creatingConnectionPixiGraphics.clear();
      this.#pixiWorld.addChild(this.#creatingConnectionPixiGraphics);
      this.#creatingConnectionPixiGraphics.lineStyle(lineWidth, lineColor);
      const pinPosition = CCComponentEditorRendererNode.getPinAbsolute(
        this.#store,
        nodeId,
        pinId
      );
      this.#creatingConnectionPixiGraphics.moveTo(pinPosition.x, pinPosition.y);
      this.#dragState = {
        startPosition: e.global.clone(),
        target: {
          type: "pin",
          pinId,
          nodeId,
          initialPosition: pinPosition.clone(),
        },
      };
    };
    const onDragEndPin = (_: PIXI.FederatedMouseEvent, pinId: CCPinId) => {
      this.#creatingConnectionPixiGraphics?.clear();
      const pinType = this.#store.pins.get(pinId)?.type;
      if (this.#dragState?.target.type === "pin") {
        const anotherPinId = this.#dragState.target.pinId;
        const anotherPinType = this.#store.pins.get(anotherPinId)?.type;
        const anotherNodeId = this.#dragState.target.nodeId;
        if (pinType === "input" && anotherPinType === "output") {
          const beforeConnectionId =
            this.#store.connections.getConnectionIdByPinId(nodeId, pinId);
          const anotherBeforeConnectionId =
            this.#store.connections.getConnectionIdByPinId(
              anotherNodeId,
              anotherPinId
            );
          if (!beforeConnectionId && !anotherBeforeConnectionId) {
            const newConnection = CCConnectionStore.create({
              to: { nodeId, pinId },
              from: { nodeId: anotherNodeId, pinId: anotherPinId },
              parentComponentId: this.#componentId,
              bentPortion: 0.5,
            });
            this.#store.connections.register(newConnection);
          }
        } else if (pinType === "output" && anotherPinType === "input") {
          const beforeConnectionId =
            this.#store.connections.getConnectionIdByPinId(nodeId, pinId);
          const anotherBeforeConnectionId =
            this.#store.connections.getConnectionIdByPinId(
              anotherNodeId,
              anotherPinId
            );
          if (!beforeConnectionId && !anotherBeforeConnectionId) {
            const newConnection = CCConnectionStore.create({
              from: { nodeId, pinId },
              to: { nodeId: anotherNodeId, pinId: anotherPinId },
              parentComponentId: this.#componentId,
              bentPortion: 0.5,
            });
            this.#store.connections.register(newConnection);
          }
        }
      }
      this.#dragState = null;
    };
    const simulation = (targetNodeId: CCNodeId) => {
      const editorState = this.#componentEditorStore.getState();
      const pinIds = this.#store.pins.getPinIdsByComponentId(this.#componentId);
      const input = new Map<CCPinId, boolean>();
      for (const pinId of pinIds) {
        const pin = this.#store.pins.get(pinId)!;
        if (pin.type === "input") {
          if (pin.implementation.type === "user") {
            const implementationNodeId = pin.implementation.nodeId;
            const implementationPinId = pin.implementation.pinId;
            if (
              !this.#store.connections.getConnectionIdByPinId(
                implementationNodeId,
                implementationPinId
              )
            ) {
              const inputValue = editorState.getInputValue(
                implementationNodeId,
                implementationPinId
              );
              input.set(pinId, inputValue);
            }
          }
        }
      }
      const output = this.#simulator.simulation(input);
      const nodeOutput = new Map<CCPinId, boolean>();
      for (const [outputPinId, outputValue] of output) {
        const pin = this.#store.pins.get(outputPinId)!;
        if (
          pin.implementation.type === "user" &&
          pin.implementation.nodeId === targetNodeId
        ) {
          nodeOutput.set(pin.implementation.pinId, outputValue);
        }
      }
      return nodeOutput;
    };
    const newNodeRenderer = new CCComponentEditorRendererNode({
      store: this.#store,
      componentEditorStore: this.#componentEditorStore,
      nodeId,
      pixiParentContainer: this.#pixiWorld,
      onDragStart,
      onDragStartPin,
      onDragEndPin,
      simulation,
    });
    this.#nodeRenderers.set(nodeId, newNodeRenderer);
  }

  #addConnectionRenderer(connectionId: CCConnectionId) {
    const onDragStart = (e: PIXI.FederatedMouseEvent) => {
      const { toWorldPosition } = this.#componentEditorStore.getState();
      this.#dragState = {
        startPosition: e.global.clone(),
        target: {
          type: "connection",
          connectionId,
          initialPosition: toWorldPosition(e.global.clone()),
        },
      };
    };
    const newConnectionRenderer = new CCComponentEditorRendererConnection(
      this.#store,
      connectionId,
      this.#pixiWorld,
      this.#componentEditorStore,
      onDragStart
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

  #render = () => {
    const { worldPerspective, toCanvasPosition } =
      this.#componentEditorStore.getState();
    this.#pixiWorld.position = toCanvasPosition(new PIXI.Point(0, 0));
    this.#pixiWorld.scale = {
      x: worldPerspective.scale,
      y: worldPerspective.scale,
    };
  };

  // eslint-disable-next-line class-methods-use-this
  destroy() {
    this.#store.nodes.off("didRegister", this.#onNodeAdded);
    this.#store.nodes.off("didUnregister", this.#onNodeRemoved);
    for (const renderer of this.#nodeRenderers.values()) renderer.destroy();
    this.#rangeSelectRenderer.destroy();
    this.#unsubscribeComponentEditorStore();
    this.#pixiApplication.destroy(true);
  }
}
