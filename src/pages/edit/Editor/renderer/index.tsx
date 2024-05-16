import * as PIXI from "pixi.js";
import invariant from "tiny-invariant";
import { editorBackgroundColor } from "../../../../common/theme";
import type { CCComponentId } from "../../../../store/component";
import type { CCNode, CCNodeId } from "../../../../store/node";
import CCComponentEditorRendererNode from "./node";
import {
  CCConnectionStore,
  type CCConnection,
  type CCConnectionId,
} from "../../../../store/connection";
import CCComponentEditorRendererConnection from "./connection";
import CCComponentEditorRendererRangeSelect from "./rangeSelect";
import type { CCComponentPinId } from "../../../../store/componentPin";
import CCSimulator from "./simulator";
import type { CCComponentEditorRendererContext } from "./base";
import CCComponentEditorRendererBase from "./base";

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
        pinId: CCComponentPinId;
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
  context: CCComponentEditorRendererContext;
  componentId: CCComponentId;
  htmlContainer: HTMLDivElement;
  onContextMenu: (position: PIXI.Point) => void;
};

/**
 * Class for rendering component editor
 */
export default class CCComponentEditorRenderer extends CCComponentEditorRendererBase {
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

  /**
   * Constructor of CCComponentEditorRenderer
   * @param props
   */
  constructor(props: CCComponentEditorRendererProps) {
    super(props.context);
    this.#componentId = props.componentId;
    this.#htmlContainer = props.htmlContainer;
    this.#simulator = new CCSimulator({
      store: this.context.store,
      componentEditorStore: this.context.componentEditorStore,
      componentId: this.#componentId,
    });
    invariant(this.context.store.components.get(props.componentId));

    const rect = this.#htmlContainer.getBoundingClientRect();
    this.context.componentEditorStore
      .getState()
      .setCanvasSize(new PIXI.Point(rect.width, rect.height));
    this.#resizeObserver = new ResizeObserver(([entry]) => {
      const contentRect = entry?.contentRect;
      if (!contentRect) return;
      this.context.componentEditorStore
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
      store: this.context.store,
      componentEditorStore: this.context.componentEditorStore,
      pixiParentContainer: this.#pixiWorld,
    });
    this.#pixiApplication.stage.addChild(this.#pixiWorld);
    // this.#pixiApplication.stage.interactive = true;
    this.#pixiApplication.stage.eventMode = "dynamic";
    this.#pixiApplication.stage.hitArea = { contains: () => true }; // Capture events everywhere
    this.#pixiApplication.stage.on("pointerdown", (e) => {
      const { worldPerspective, toWorldPosition } =
        this.context.componentEditorStore.getState();
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
        this.context.componentEditorStore
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
      this.context.componentEditorStore.getState().selectNode([], true);
    });
    this.#pixiApplication.stage.on("pointermove", (e) => {
      if (!this.#dragState) return;
      const { worldPerspective, setWorldPerspective } =
        this.context.componentEditorStore.getState();
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
          for (const nodeId of this.context.componentEditorStore.getState()
            .selectedNodeIds) {
            const initialPosition = this.#dragState.target.initialPosition.get(
              nodeId as CCNodeId
            )!;
            this.context.store.nodes.update(nodeId as CCNodeId, {
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
          this.context.componentEditorStore.getState().setRangeSelect({
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
      this.context.componentEditorStore.getState().setRangeSelect(null);
      if (this.#creatingConnectionPixiGraphics != null) {
        this.#creatingConnectionPixiGraphics.clear();
      }
      this.#rangeSelectRenderer.render();
    });

    this.#pixiApplication.stage.on("pointerleave", () => {
      this.#dragState = null;
      this.context.componentEditorStore.getState().setRangeSelect(null);
      this.#rangeSelectRenderer.render();
    });

    this.context.store.nodes
      .getNodeIdsByParentComponentId(this.#componentId)
      .forEach((nodeId) => this.#addNodeRenderer(nodeId));
    this.context.store.nodes.on("didRegister", this.#onNodeAdded);
    this.context.store.nodes.on("didUnregister", this.#onNodeRemoved);

    this.context.store.connections
      .getConnectionIdsByParentComponentId(this.#componentId)
      .forEach((connectionId) => this.#addConnectionRenderer(connectionId));
    this.context.store.connections.on("didRegister", this.#onConnectionAdded);
    this.context.store.connections.on(
      "didUnregister",
      this.#onConnectionRemoved
    );

    // Support zooming
    this.#pixiApplication.stage.on("wheel", (e) => {
      const { zoom, toWorldPosition } =
        this.context.componentEditorStore.getState();
      zoom(toWorldPosition(e.global), 0.999 ** e.deltaY);
    });

    // Context menu
    this.#pixiApplication.stage.on("rightclick", (e) => {
      const componentEditorState = this.context.componentEditorStore.getState();
      if (componentEditorState.editorMode === "play") return;
      props.onContextMenu(e.global.clone());
      e.preventDefault();
    });

    this.#unsubscribeComponentEditorStore =
      this.context.componentEditorStore.subscribe(this.#render);
    this.#render();
  }

  /**
   * Add node renderer
   * @param nodeId id of node
   */
  #addNodeRenderer(nodeId: CCNodeId) {
    if (this.#nodeRenderers.has(nodeId)) return;
    const onDragStart = (e: PIXI.FederatedMouseEvent) => {
      const { selectedNodeIds } = this.context.componentEditorStore.getState();
      const initialPosition = new Map<CCNodeId, PIXI.Point>();
      for (const selectedNodeId of selectedNodeIds) {
        const selectedNode = this.context.store.nodes.get(selectedNodeId)!;
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
    const onDragStartPin = (
      e: PIXI.FederatedMouseEvent,
      pinId: CCComponentPinId
    ) => {
      // const node = this.context.store.nodes.get(nodeId)!;
      const { toWorldPosition, editorMode } =
        this.context.componentEditorStore.getState();
      // const componentEditorState = this.context.componentEditorStore.getState();
      if (editorMode === "play") return;
      const lineWidth = 2;
      const lineColor = 0x000000;
      // this.#creatingConnectionPixiGraphics.clear();
      this.#pixiWorld.addChild(this.#creatingConnectionPixiGraphics);
      this.#creatingConnectionPixiGraphics.lineStyle(lineWidth, lineColor);
      const pinPosition = CCComponentEditorRendererNode.getNodePinAbsolute(
        this.context.store,
        this.context.store.nodePins.getByImplementationNodeIdAndPinId(
          nodeId,
          pinId
        ).id
      );
      this.#creatingConnectionPixiGraphics.moveTo(pinPosition.x, pinPosition.y);
      this.#dragState = {
        startPosition: e.global.clone(),
        target: {
          type: "pin",
          pinId,
          nodeId,
          initialPosition: toWorldPosition(e.global.clone()),
        },
      };
    };
    const onDragEndPin = (
      _: PIXI.FederatedMouseEvent,
      pinId: CCComponentPinId
    ) => {
      this.#creatingConnectionPixiGraphics?.clear();
      const pinType = this.context.store.componentPins.get(pinId)?.type;
      if (this.#dragState?.target.type === "pin") {
        const anotherPinId = this.#dragState.target.pinId;
        const anotherPinType =
          this.context.store.componentPins.get(anotherPinId)?.type;
        const anotherNodeId = this.#dragState.target.nodeId;
        const { id: anotherNodePinId } =
          this.context.store.nodePins.getByImplementationNodeIdAndPinId(
            anotherNodeId,
            anotherPinId
          );
        const { id: nodePinId } =
          this.context.store.nodePins.getByImplementationNodeIdAndPinId(
            nodeId,
            pinId
          );
        if (pinType === "input" && anotherPinType === "output") {
          if (this.context.store.connections.hasNoConnectionOf(nodePinId)) {
            const newConnection = CCConnectionStore.create({
              to: nodePinId,
              from: anotherNodePinId,
              parentComponentId: this.#componentId,
              bentPortion: 0.5,
            });
            this.context.store.connections.register(newConnection);
          }
        } else if (pinType === "output" && anotherPinType === "input") {
          if (
            this.context.store.connections.hasNoConnectionOf(anotherNodePinId)
          ) {
            const newConnection = CCConnectionStore.create({
              from: nodePinId,
              to: anotherNodePinId,
              parentComponentId: this.#componentId,
              bentPortion: 0.5,
            });
            this.context.store.connections.register(newConnection);
          }
        }
      }
      this.#dragState = null;
    };

    const simulation = (targetNodeId: CCNodeId) => {
      const editorState = this.context.componentEditorStore.getState();
      const pinIds = this.context.store.componentPins.getPinIdsByComponentId(
        this.#componentId
      );
      const input = new Map<CCComponentPinId, boolean[]>();
      for (const pinId of pinIds) {
        const pin = this.context.store.componentPins.get(pinId)!;
        if (pin.type === "input") {
          // is pin implemented by user
          if (pin.implementation !== null) {
            if (
              this.context.store.connections.getConnectionsByNodePinId(
                pin.implementation
              )!.length === 0
            ) {
              const inputValue = editorState.getInputValue(
                implementationNodeId,
                pinId,
                pin.bits
              );
              input.set(pinId, inputValue);
            }
          }
        }
      }
      const output = this.#simulator.simulation(input, editorState.timeStep);
      if (output == null) return null;
      const nodeOutput = new Map<CCComponentPinId, boolean[]>();
      for (const [outputPinId, outputValue] of output) {
        const pin = this.context.store.componentPins.get(outputPinId)!;
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
      context: this.context,
      nodeId,
      pixiParentContainer: this.#pixiWorld,
      onDragStart,
      onDragStartPin,
      onDragEndPin,
      simulation,
    });
    this.#nodeRenderers.set(nodeId, newNodeRenderer);
  }

  /**
   * Add connection renderer
   * @param connectionId id of connection
   */
  #addConnectionRenderer(connectionId: CCConnectionId) {
    const onDragStart = (e: PIXI.FederatedMouseEvent) => {
      const { toWorldPosition } = this.context.componentEditorStore.getState();
      this.#dragState = {
        startPosition: e.global.clone(),
        target: {
          type: "connection",
          connectionId,
          initialPosition: toWorldPosition(e.global.clone()),
        },
      };
    };
    const getPinValue = () => {
      const nodePinId = this.context.store.connections.get(connectionId)!.from;
      return this.#simulator.getPinValue(nodeId, pinId);
    };
    const newConnectionRenderer = new CCComponentEditorRendererConnection(
      this.context.store,
      connectionId,
      this.#pixiWorld,
      this.context.componentEditorStore,
      onDragStart,
      getPinValue
    );
    this.#connectionRenderers.set(connectionId, newConnectionRenderer);
  }

  /**
   * Event handler for adding connection
   * @param connection connection
   */
  #onConnectionAdded = (connection: CCConnection) => {
    if (connection.parentComponentId !== this.#componentId) return;
    this.#addConnectionRenderer(connection.id);
    this.#simulator.clear();
  };

  /**
   * Event handler for removing connection
   * @param connection connection
   */
  #onConnectionRemoved = (connection: CCConnection) => {
    if (connection.parentComponentId !== this.#componentId) return;
    this.#connectionRenderers.get(connection.id)?.destroy();
    this.#connectionRenderers.delete(connection.id);
    this.#simulator.clear();
  };

  /**
   * Event handler for adding node
   * @param node node
   */
  #onNodeAdded = (node: CCNode) => {
    if (node.parentComponentId !== this.#componentId) return;
    this.#addNodeRenderer(node.id);
    this.#simulator.clear();
  };

  /**
   * Event handler for removing node
   * @param node node
   */
  #onNodeRemoved = (node: CCNode) => {
    if (node.parentComponentId !== this.#componentId) return;
    this.#nodeRenderers.get(node.id)?.destroy();
    this.#nodeRenderers.delete(node.id);
    this.#simulator.clear();
  };

  /**
   * Render the component editor
   */
  #render = () => {
    const { worldPerspective, toCanvasPosition } =
      this.context.componentEditorStore.getState();
    this.#pixiWorld.position = toCanvasPosition(new PIXI.Point(0, 0));
    this.#pixiWorld.scale = {
      x: worldPerspective.scale,
      y: worldPerspective.scale,
    };
  };

  /**
   * Destroy the component editor
   */
  // eslint-disable-next-line class-methods-use-this
  override destroy() {
    super.destroy();
    this.context.store.nodes.off("didRegister", this.#onNodeAdded);
    this.context.store.nodes.off("didUnregister", this.#onNodeRemoved);
    for (const renderer of this.#nodeRenderers.values()) renderer.destroy();
    this.#rangeSelectRenderer.destroy();
    this.#unsubscribeComponentEditorStore();
    this.#pixiApplication.destroy(true);
  }
}
