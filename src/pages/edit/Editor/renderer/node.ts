// import type { Point } from "pixi.js";
import * as PIXI from "pixi.js";
import type { Point } from "pixi.js";
import nullthrows from "nullthrows";
import { blackColor, primaryColor, whiteColor } from "../../../../common/theme";
import type { CCNodeId } from "../../../../store/node";
import { type CCComponentPinId } from "../../../../store/componentPin";
import type CCStore from "../../../../store";
import CCComponentEditorRendererNodePin from "./nodePin";
import CCComponentEditorRendererComponentPin from "./componentPin";
import { rearrangeRangeSelect } from "./rangeSelect";
import CCComponentEditorRendererBase, {
  type CCComponentEditorRendererContext,
} from "./base";
import type { CCNodePinId } from "../../../../store/nodePin";

export type CCComponentEditorRendererNodeProps = {
  context: CCComponentEditorRendererContext;
  nodeId: CCNodeId;
  pixiParentContainer: PIXI.Container;
  onDragStart(e: PIXI.FederatedMouseEvent): void;
  onDragStartPin(e: PIXI.FederatedMouseEvent, nodePinId: CCNodePinId): void;
  onDragEndPin(e: PIXI.FederatedMouseEvent, nodePinId: CCNodePinId): void;
  // simulation(nodeId: CCNodeId): Map<CCComponentPinId, boolean[]> | null;
};

type PixiTexts = {
  componentName: PIXI.Text;
  pinNames: Map<string, PIXI.Text>;
};

/**
 * Get size of node
 * @param inputPinCount
 * @param outputPinCount
 * @returns size
 */
const getSize = (inputPinCount: number, outputPinCount: number) =>
  new PIXI.Point(
    200,
    (100 / 3) * (Math.max(inputPinCount, outputPinCount) + 1)
  );

/**
 * Class for rendering node
 */
export default class CCComponentEditorRendererNode extends CCComponentEditorRendererBase {
  #unsubscribeComponentEditorStore: () => void;

  #nodeId: CCNodeId;

  #pixiParentContainer: PIXI.Container;

  #pixiGraphics: PIXI.Graphics;

  static readonly #componentNameFontSize = 24;

  static readonly #edgeNameFontSize = 16;

  #pixiTexts: PixiTexts;

  #nodePinRenderers = new Map<CCNodePinId, CCComponentEditorRendererNodePin>();

  #componentPinRenderers = new Map<
    CCComponentPinId,
    CCComponentEditorRendererComponentPin
  >();

  #pixiWorld: PIXI.Container;

  // #simulation: (nodeId: CCNodeId) => Map<CCComponentPinId, boolean[]> | null;

  /**
   * Constructor of CCComponentEditorRendererNode
   * @param props
   */
  constructor(props: CCComponentEditorRendererNodeProps) {
    super(props.context);
    this.#nodeId = props.nodeId;
    this.#pixiParentContainer = props.pixiParentContainer;
    // this.#simulation = props.simulation;
    this.#pixiGraphics = new PIXI.Graphics();
    this.#pixiGraphics.eventMode = "dynamic";
    this.#pixiTexts = this.#createText();
    this.#pixiWorld = new PIXI.Container();
    this.#pixiWorld.sortableChildren = true;
    this.#pixiParentContainer.addChild(this.#pixiWorld);
    this.#pixiWorld.addChild(this.#pixiGraphics);
    this.#pixiWorld.addChild(this.#pixiTexts.componentName);

    const node = this.context.store.nodes.get(this.#nodeId)!;
    const nodePins = this.context.store.nodePins.getManyByNodeId(node.id);
    for (const nodePin of nodePins) {
      const pinRenderer = new CCComponentEditorRendererNodePin({
        context: this.context,
        nodePinId: nodePin.id,
        pixiParentContainer: this.#pixiWorld,
        pixiText: this.#pixiTexts.pinNames.get(nodePin.componentPinId)!,
        onDragStart: props.onDragStartPin,
        onDragEnd: props.onDragEndPin,
      });
      this.#nodePinRenderers.set(nodePin.id, pinRenderer);
    }

    this.reconcileChildComponentPinRenderers();

    this.#pixiGraphics.on("pointerdown", (e) => {
      if (
        this.context.componentEditorStore
          .getState()
          .selectedNodeIds.has(this.#nodeId)
      ) {
        if (e.shiftKey) {
          this.context.componentEditorStore
            .getState()
            .unselectNode([this.#nodeId]);
        }
      } else {
        this.context.componentEditorStore
          .getState()
          .selectNode([this.#nodeId], !e.shiftKey);
      }
      props.onDragStart(e);
      e.stopPropagation();
    });
    this.context.store.nodes.on("didUpdate", this.render);
    this.context.store.components.on(
      "didUpdate",
      this.reconcileChildComponentPinRenderers
    );
    this.context.store.connections.on(
      "didRegister",
      this.reconcileChildComponentPinRenderers
    );
    this.context.store.connections.on(
      "didUnregister",
      this.reconcileChildComponentPinRenderers
    );
    this.#unsubscribeComponentEditorStore =
      this.context.componentEditorStore.subscribe(this.render);
    this.render();
  }

  /**
   * Event handler for pointer down
   * @param event event
   */
  onPointerDown(event: (e: PIXI.FederatedPointerEvent) => void) {
    this.#pixiGraphics.on("pointerdown", event);
  }

  /**
   * Create text for name
   * @returns text
   */
  #createText(): PixiTexts {
    const node = this.context.store.nodes.get(this.#nodeId)!;
    const component = this.context.store.components.get(node.componentId)!;
    const componentPins = this.context.store.componentPins.getManyByComponentId(
      node.componentId
    );

    const componentName = new PIXI.Text(component.name, {
      fontSize: CCComponentEditorRendererNode.#componentNameFontSize * 3,
    });
    componentName.scale.x = 1 / 3;
    componentName.scale.y = 1 / 3;
    const map = new Map<string, PIXI.Text>();
    for (const pin of componentPins) {
      const pinText = new PIXI.Text(pin.name, {
        fontSize: CCComponentEditorRendererNode.#edgeNameFontSize * 3,
      });
      pinText.scale.x = 1 / 3;
      pinText.scale.y = 1 / 3;
      map.set(pin.id, pinText);
    }
    return { componentName, pinNames: map };
  }

  /**
   * Render node
   */
  render = () => {
    const node = this.context.store.nodes.get(this.#nodeId);
    if (!node) return;
    const nodePins = this.context.store.nodePins.getManyByNodeId(this.#nodeId);
    const inputNodePins = nodePins.filter(
      (nodePin) =>
        this.context.store.componentPins.get(nodePin.componentPinId)!.type ===
        "input"
    );
    const outputNodePins = nodePins.filter(
      (nodePin) =>
        this.context.store.componentPins.get(nodePin.componentPinId)!.type ===
        "output"
    );

    const size = getSize(inputNodePins.length, outputNodePins.length);
    const borderWidth = 3;
    const outlineWidth = 1;
    this.#pixiGraphics.clear();
    this.#pixiGraphics.beginFill(whiteColor);
    this.#pixiGraphics.lineStyle({
      color: blackColor,
      width: borderWidth,
      alignment: 1,
    });
    this.#pixiGraphics.drawRect(-size.x / 2, -size.y / 2, size.x, size.y);
    this.#pixiGraphics.endFill();
    const gap = 6;
    const edgeSize = 10;
    inputNodePins.forEach((nodePin, index) => {
      nullthrows(this.#nodePinRenderers.get(nodePin.id)).render(
        index,
        size,
        inputNodePins.length
      );
    });
    outputNodePins.forEach((nodePin, index) => {
      nullthrows(this.#nodePinRenderers.get(nodePin.id)).render(
        index,
        size,
        inputNodePins.length
      );
    });
    this.#pixiTexts.componentName.anchor.set(0, 1);
    this.#pixiTexts.componentName.x = -size.x / 2;
    this.#pixiTexts.componentName.y = -size.y / 2 - gap;

    if (
      this.context.componentEditorStore
        .getState()
        .selectedNodeIds.has(this.#nodeId)
    ) {
      this.#pixiGraphics.lineStyle({
        color: primaryColor,
        width: outlineWidth,
        alignment: 1,
      });
      const margin = 8;
      this.#pixiGraphics.drawRect(
        -size.x / 2 - borderWidth * 1.5 - edgeSize / 2,
        -size.y / 2 -
          CCComponentEditorRendererNode.#componentNameFontSize -
          margin,
        size.x + borderWidth * 3 + edgeSize,
        size.y +
          CCComponentEditorRendererNode.#componentNameFontSize +
          margin +
          borderWidth / 2 -
          outlineWidth / 2
      );
    }
    this.#pixiWorld.position = node.position;
  };

  /**
   * Reconcile child component pin renderers
   */
  reconcileChildComponentPinRenderers = () => {
    const node = this.context.store.nodes.get(this.#nodeId);
    if (!node) return;

    const nodePins = this.context.store.nodePins.getManyByNodeId(this.#nodeId);

    const existingComponentPinRenderers = new Map(this.#componentPinRenderers);
    const newComponentPinRenderers = new Map<
      CCComponentPinId,
      CCComponentEditorRendererComponentPin
    >();
    for (const nodePin of nodePins) {
      if (this.context.store.connections.hasNoConnectionOf(nodePin.id)) {
        const componentPin = this.context.store.componentPins.get(
          nodePin.componentPinId
        )!;
        const existingComponentPinRenderer = existingComponentPinRenderers.get(
          componentPin.id
        );
        if (existingComponentPinRenderer) {
          newComponentPinRenderers.set(
            componentPin.id,
            existingComponentPinRenderer
          );
          existingComponentPinRenderers.delete(componentPin.id);
        } else {
          // const simulation = () => {
          //   return this.#simulation(this.#nodeId);
          // };
          const componentPinRenderer =
            new CCComponentEditorRendererComponentPin({
              context: this.context,
              pixiParentContainer: this.#pixiWorld,
              nodeId: this.#nodeId,
              pinId: componentPin.id,
              position: CCComponentEditorRendererNode.getPinOffset(
                this.context.store,
                nodePin.id
              ),
              // simulation,
            });
          newComponentPinRenderers.set(componentPin.id, componentPinRenderer);
        }
      }
    }
    for (const componentPinRenderer of existingComponentPinRenderers.values()) {
      componentPinRenderer.destroy();
    }
    this.#componentPinRenderers = newComponentPinRenderers;
  };

  /**
   * Judge if the range is selected
   * @param start_ start
   * @param end_ end
   */
  judgeIsRangeSelected(start_: PIXI.Point, end_: PIXI.Point) {
    const { start, end } = rearrangeRangeSelect({ start: start_, end: end_ });
    const node = this.context.store.nodes.get(this.#nodeId)!;
    const componentPins = this.context.store.componentPins.getManyByComponentId(
      node.componentId
    );
    const inputComponentPins = componentPins.filter(
      (pin) => pin.type === "input"
    );
    const outputComponentPins = componentPins.filter(
      (pin) => pin.type === "output"
    );
    const size = getSize(inputComponentPins.length, outputComponentPins.length);
    const nodePosition = node.position;
    const nodePositions = [
      new PIXI.Point(nodePosition.x - size.x / 2, nodePosition.y - size.y / 2),
      new PIXI.Point(nodePosition.x - size.x / 2, nodePosition.y + size.y / 2),
      new PIXI.Point(nodePosition.x + size.x / 2, nodePosition.y - size.y / 2),
      new PIXI.Point(nodePosition.x + size.x / 2, nodePosition.y + size.y / 2),
    ];
    if (
      Math.max(nodePositions[0]!.x, start.x) <
        Math.min(nodePositions[3]!.x, end.x) &&
      Math.max(nodePositions[0]!.y, start.y) <
        Math.min(nodePositions[3]!.y, end.y)
    ) {
      this.context.componentEditorStore.getState().selectNode([node.id], false);
    } else {
      this.context.componentEditorStore.getState().unselectNode([node.id]);
    }
  }

  /**
   * Destroy node
   */
  override destroy() {
    super.destroy();
    this.#pixiGraphics.destroy();
    this.#pixiTexts.componentName.destroy();
    for (const text of this.#pixiTexts.pinNames) {
      text[1].destroy();
    }
    for (const pinRenderer of this.#nodePinRenderers.values()) {
      pinRenderer.destroy();
    }
    for (const componentPinRenderer of this.#componentPinRenderers.values()) {
      componentPinRenderer.destroy();
    }
    this.context.store.nodes.off("didUpdate", this.render);
    this.context.store.components.off(
      "didUpdate",
      this.reconcileChildComponentPinRenderers
    );
    this.context.store.connections.off(
      "didRegister",
      this.reconcileChildComponentPinRenderers
    );
    this.context.store.connections.off(
      "didUnregister",
      this.reconcileChildComponentPinRenderers
    );
    this.#unsubscribeComponentEditorStore();
  }

  /**
   * Get offset of position of pin in node
   * @param store store
   * @param nodeId id of node
   * @param componentPinId id of pin
   * @returns offset
   */
  static getPinOffset(store: CCStore, nodePinId: CCNodePinId): Point {
    const nodePin = store.nodePins.get(nodePinId)!;
    const node = store.nodes.get(nodePin.nodeId)!;
    const component = store.components.get(node.componentId)!;
    const componentPins = store.componentPins.getManyByComponentId(
      component.id
    );
    const inputComponentPinIds = componentPins
      .filter((pin) => pin.type === "input")
      .map((pin) => pin.id);
    const inputComponentPinCount = inputComponentPinIds.length;
    const outputComponentPinIds = componentPins
      .filter((pin) => pin.type === "output")
      .map((pin) => pin.id);
    const outputPinCount = outputComponentPinIds.length;
    const size = getSize(inputComponentPinCount, outputPinCount);
    if (inputComponentPinIds.includes(nodePin.componentPinId)) {
      const pinIndex = inputComponentPinIds.indexOf(nodePin.componentPinId);
      return new PIXI.Point(
        -size.x / 2,
        -size.y / 2 + (size.y / (inputComponentPinCount + 1)) * (pinIndex + 1)
      );
    }
    if (outputComponentPinIds.includes(nodePin.componentPinId)) {
      const pinIndex = outputComponentPinIds.indexOf(nodePin.componentPinId);
      return new PIXI.Point(
        size.x / 2,
        -size.y / 2 + (size.y / (outputPinCount + 1)) * (pinIndex + 1)
      );
    }
    throw Error(
      `pin: ${nodePin.componentPinId} not found in node: ${nodePin.nodeId}`
    );
  }

  /**
   * Get absolute position of NodePin
   * @param store store
   * @param nodeId id of node
   * @param pinId id of pin
   * @returns absolute position
   */
  static getNodePinAbsolute(store: CCStore, nodePinId: CCNodePinId): Point {
    const nodePin = nullthrows(store.nodePins.get(nodePinId));
    const node = nullthrows(store.nodes.get(nodePin.nodeId));
    const componentPin = nullthrows(
      store.componentPins.get(nodePin.componentPinId)
    );
    const componentPins = store.componentPins.getManyByComponentId(
      node.componentId
    );
    const inputComponentPinIds = componentPins
      .filter((pin) => pin.type === "input")
      .map((pin) => pin.id);
    const inputComponentPinCount = inputComponentPinIds.length;
    const outputComponentPinIds = componentPins
      .filter((pin) => pin.type === "output")
      .map((pin) => pin.id);
    const outputPinCount = outputComponentPinIds.length;
    const size = getSize(inputComponentPinCount, outputPinCount);
    if (componentPin.type === "input") {
      const pinIndex = inputComponentPinIds.indexOf(componentPin.id);
      return new PIXI.Point(
        node.position.x - size.x / 2,
        node.position.y -
          size.y / 2 +
          (size.y / (inputComponentPinCount + 1)) * (pinIndex + 1)
      );
    }
    if (componentPin.type === "output") {
      const pinIndex = outputComponentPinIds.indexOf(componentPin.id);
      return new PIXI.Point(
        node.position.x + size.x / 2,
        node.position.y -
          size.y / 2 +
          (size.y / (outputPinCount + 1)) * (pinIndex + 1)
      );
    }

    throw Error(`pin: ${componentPin.id} not found in node: ${node.id}`);
  }
}
