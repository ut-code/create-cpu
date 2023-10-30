// import type { Point } from "pixi.js";
import * as PIXI from "pixi.js";
import type { Point } from "pixi.js";
import { blackColor, primaryColor, whiteColor } from "../../../../common/theme";
import type { CCNodeId } from "../../../../store/node";
import { type CCPinId } from "../../../../store/pin";
import type CCStore from "../../../../store";
import CCComponentEditorRendererNodePin from "./nodePin";
import CCComponentEditorRendererComponentPin from "./componentPin";
import { rearrangeRangeSelect } from "./rangeSelect";
import CCComponentEditorRendererBase, {
  type CCComponentEditorRendererContext,
} from "./base";

export type CCComponentEditorRendererNodeProps = {
  context: CCComponentEditorRendererContext;
  nodeId: CCNodeId;
  pixiParentContainer: PIXI.Container;
  onDragStart(e: PIXI.FederatedMouseEvent): void;
  onDragStartPin(e: PIXI.FederatedMouseEvent, pinId: CCPinId): void;
  onDragEndPin(e: PIXI.FederatedMouseEvent, pinId: CCPinId): void;
  simulation(nodeId: CCNodeId): Map<CCPinId, boolean>;
  multipleSimulation(nodeId: CCNodeId): Map<CCPinId, boolean[]> | null;
};

type PixiTexts = {
  componentName: PIXI.Text;
  pinNames: Map<string, PIXI.Text>;
};

const getSize = (inputPinCount: number, outputPinCount: number) =>
  new PIXI.Point(
    200,
    (100 / 3) * (Math.max(inputPinCount, outputPinCount) + 1)
  );

export default class CCComponentEditorRendererNode extends CCComponentEditorRendererBase {
  #unsubscribeComponentEditorStore: () => void;

  #nodeId: CCNodeId;

  #pixiParentContainer: PIXI.Container;

  #pixiGraphics: PIXI.Graphics;

  static readonly #componentNameFontSize = 24;

  static readonly #edgeNameFontSize = 16;

  #pixiTexts: PixiTexts;

  #nodePinRenderers = new Map<CCPinId, CCComponentEditorRendererNodePin>();

  #componentPinRenderers = new Map<
    CCPinId,
    CCComponentEditorRendererComponentPin
  >();

  #pixiWorld: PIXI.Container;

  #simulation: (nodeId: CCNodeId) => Map<CCPinId, boolean>;

  #multipleSimulation: (nodeId: CCNodeId) => Map<CCPinId, boolean[]> | null;

  constructor(props: CCComponentEditorRendererNodeProps) {
    super(props.context);
    this.#nodeId = props.nodeId;
    this.#pixiParentContainer = props.pixiParentContainer;
    this.#simulation = props.simulation;
    this.#multipleSimulation = props.multipleSimulation;
    this.#pixiGraphics = new PIXI.Graphics();
    this.#pixiGraphics.interactive = true;
    this.#pixiTexts = this.#createText();
    this.#pixiWorld = new PIXI.Container();
    this.#pixiParentContainer.addChild(this.#pixiWorld);
    this.#pixiWorld.addChild(this.#pixiGraphics);
    this.#pixiWorld.addChild(this.#pixiTexts.componentName);

    const node = this.context.store.nodes.get(this.#nodeId)!;
    const pinIds = this.context.store.pins
      .getPinIdsByComponentId(node.componentId)
      .filter((pinId) => {
        const pin = this.context.store.pins.get(pinId)!;
        return (
          pin.implementation.type === "intrinsic" ||
          (pin.implementation.type === "user" &&
            this.context.store.connections.getConnectionIdsByPinId(
              pin.implementation.nodeId,
              pin.implementation.pinId
            )?.length === 0)
        );
      });
    for (const pinId of pinIds) {
      const pinRenderer = new CCComponentEditorRendererNodePin({
        store: this.context.store,
        nodeId: props.nodeId,
        pinId,
        pixiParentContainer: this.#pixiWorld,
        pixiText: this.#pixiTexts.pinNames.get(pinId)!,
        onDragStart: props.onDragStartPin,
        onDragEnd: props.onDragEndPin,
      });
      this.#nodePinRenderers.set(pinId, pinRenderer);
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

  onPointerDown(event: (e: PIXI.FederatedPointerEvent) => void) {
    this.#pixiGraphics.on("pointerdown", event);
  }

  #createText(): PixiTexts {
    const node = this.context.store.nodes.get(this.#nodeId)!;
    const component = this.context.store.components.get(node.componentId)!;
    const pins = this.context.store.pins
      .getPinIdsByComponentId(component.id)
      .map((pinId) => this.context.store.pins.get(pinId)!);

    const componentName = new PIXI.Text(component.name, {
      fontSize: CCComponentEditorRendererNode.#componentNameFontSize * 3,
    });
    componentName.scale.x = 1 / 3;
    componentName.scale.y = 1 / 3;
    const map = new Map<string, PIXI.Text>();
    for (const pin of pins) {
      const pinText = new PIXI.Text(pin.name, {
        fontSize: CCComponentEditorRendererNode.#edgeNameFontSize * 3,
      });
      pinText.scale.x = 1 / 3;
      pinText.scale.y = 1 / 3;
      map.set(pin.id, pinText);
    }
    return { componentName, pinNames: map };
  }

  render = () => {
    const node = this.context.store.nodes.get(this.#nodeId)!;
    const component = this.context.store.components.get(node.componentId)!;
    const pins = this.context.store.pins
      .getPinIdsByComponentId(component.id)
      .map((pinId) => this.context.store.pins.get(pinId)!);
    const inputPins = pins.filter((pin) => {
      if (pin.type === "output") {
        return false;
      }
      if (pin.implementation.type === "intrinsic") {
        return true;
      }
      const implementationNodeId = pin.implementation.nodeId;
      const implementationPinId = pin.implementation.pinId;
      return (
        this.context.store.connections.getConnectionIdsByPinId(
          implementationNodeId,
          implementationPinId
        )?.length === 0
      );
    });
    const outputPins = pins.filter((pin) => {
      if (pin.type === "input") {
        return false;
      }
      if (pin.implementation.type === "intrinsic") {
        return true;
      }
      const implementationNodeId = pin.implementation.nodeId;
      const implementationPinId = pin.implementation.pinId;
      return (
        this.context.store.connections.getConnectionIdsByPinId(
          implementationNodeId,
          implementationPinId
        )?.length === 0
      );
    });
    const size = getSize(inputPins.length, outputPins.length);
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
    inputPins.forEach((pin, index) => {
      const pinRenderer = this.#nodePinRenderers.get(pin.id);
      pinRenderer?.render(index, size, inputPins.length);
    });
    outputPins.forEach((pin, index) => {
      const pinRenderer = this.#nodePinRenderers.get(pin.id);
      pinRenderer?.render(index, size, outputPins.length);
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

  reconcileChildComponentPinRenderers = () => {
    const node = this.context.store.nodes.get(this.#nodeId)!;
    const pinIds = this.context.store.pins
      .getPinIdsByComponentId(node.componentId)
      .filter((pinId) => {
        const pin = this.context.store.pins.get(pinId)!;
        return (
          pin.implementation.type === "intrinsic" ||
          (pin.implementation.type === "user" &&
            this.context.store.connections.getConnectionIdsByPinId(
              pin.implementation.nodeId,
              pin.implementation.pinId
            )?.length === 0)
        );
      });

    const existingComponentPinRenderers = new Map(this.#componentPinRenderers);
    const newComponentPinRenderers = new Map<
      CCPinId,
      CCComponentEditorRendererComponentPin
    >();
    for (const pinId of pinIds) {
      if (
        this.context.store.connections.getConnectionIdsByPinId(
          this.#nodeId,
          pinId
        )?.length === 0
      ) {
        const existingComponentPinRenderer =
          existingComponentPinRenderers.get(pinId);
        if (existingComponentPinRenderer) {
          newComponentPinRenderers.set(pinId, existingComponentPinRenderer);
          existingComponentPinRenderers.delete(pinId);
        } else {
          const simulation = () => {
            return this.#simulation(this.#nodeId);
          };
          const multipleSimulation = () => {
            return this.#multipleSimulation(this.#nodeId);
          };
          const componentPinRenderer =
            new CCComponentEditorRendererComponentPin({
              store: this.context.store,
              componentEditorStore: this.context.componentEditorStore,
              pixiParentContainer: this.#pixiWorld,
              nodeId: this.#nodeId,
              pinId,
              position: CCComponentEditorRendererNode.getPinOffset(
                this.context.store,
                this.#nodeId,
                pinId
              ),
              simulation,
              multipleSimulation,
            });
          newComponentPinRenderers.set(pinId, componentPinRenderer);
        }
      }
    }
    for (const componentPinRenderer of existingComponentPinRenderers.values()) {
      componentPinRenderer.destroy();
    }
    this.#componentPinRenderers = newComponentPinRenderers;
  };

  judgeIsRangeSelected(start_: PIXI.Point, end_: PIXI.Point) {
    const { start, end } = rearrangeRangeSelect({ start: start_, end: end_ });
    const node = this.context.store.nodes.get(this.#nodeId)!;
    const component = this.context.store.components.get(node.componentId)!;
    const pins = this.context.store.pins
      .getPinIdsByComponentId(component.id)
      .map((pinId) => this.context.store.pins.get(pinId)!);
    const inputPins = pins.filter((pin) => pin.type === "input");
    const outputPins = pins.filter((pin) => pin.type === "output");
    const size = getSize(inputPins.length, outputPins.length);
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

  static getPinOffset(store: CCStore, nodeId: CCNodeId, pinId: CCPinId): Point {
    const node = store.nodes.get(nodeId)!;
    const component = store.components.get(node.componentId)!;
    const pinIds = store.pins
      .getPinIdsByComponentId(component.id)!
      .filter((pinId_) => {
        const pin = store.pins.get(pinId_)!;
        return (
          pin.implementation.type === "intrinsic" ||
          (pin.implementation.type === "user" &&
            store.connections.getConnectionIdsByPinId(
              pin.implementation.nodeId,
              pin.implementation.pinId
            )?.length === 0)
        );
      });
    const pins = pinIds.map((id) => store.pins.get(id)!);
    const inputPinIds = pins
      .filter((pin) => pin.type === "input")
      .map((pin) => pin.id);
    const inputPinCount = inputPinIds.length;
    const outputPinIds = pins
      .filter((pin) => pin.type === "output")
      .map((pin) => pin.id);
    const outputPinCount = outputPinIds.length;
    const size = getSize(inputPinCount, outputPinCount);
    if (inputPinIds.includes(pinId)) {
      const pinIndex = inputPinIds.indexOf(pinId);
      return new PIXI.Point(
        -size.x / 2,
        -size.y / 2 + (size.y / (inputPinCount + 1)) * (pinIndex + 1)
      );
    }
    if (outputPinIds.includes(pinId)) {
      const pinIndex = outputPinIds.indexOf(pinId);
      return new PIXI.Point(
        size.x / 2,
        -size.y / 2 + (size.y / (outputPinCount + 1)) * (pinIndex + 1)
      );
    }

    throw Error(`pin: ${pinId} not found in node: ${node.id}`);
  }

  static getPinAbsolute(
    store: CCStore,
    nodeId: CCNodeId,
    pinId: CCPinId
  ): Point {
    const node = store.nodes.get(nodeId)!;
    const component = store.components.get(node.componentId)!;
    const pinIds = store.pins
      .getPinIdsByComponentId(component.id)!
      .filter((pinId_) => {
        const pin = store.pins.get(pinId_)!;
        return (
          pin.implementation.type === "intrinsic" ||
          (pin.implementation.type === "user" &&
            store.connections.getConnectionIdsByPinId(
              pin.implementation.nodeId,
              pin.implementation.pinId
            )?.length === 0)
        );
      });
    const pins = pinIds.map((id) => store.pins.get(id)!);
    const inputPinIds = pins
      .filter((pin) => pin.type === "input")
      .map((pin) => pin.id);
    const inputPinCount = inputPinIds.length;
    const outputPinIds = pins
      .filter((pin) => pin.type === "output")
      .map((pin) => pin.id);
    const outputPinCount = outputPinIds.length;
    const size = getSize(inputPinCount, outputPinCount);
    if (inputPinIds.includes(pinId)) {
      const pinIndex = inputPinIds.indexOf(pinId);
      return new PIXI.Point(
        node.position.x - size.x / 2,
        node.position.y -
          size.y / 2 +
          (size.y / (inputPinCount + 1)) * (pinIndex + 1)
      );
    }
    if (outputPinIds.includes(pinId)) {
      const pinIndex = outputPinIds.indexOf(pinId);
      return new PIXI.Point(
        node.position.x + size.x / 2,
        node.position.y -
          size.y / 2 +
          (size.y / (outputPinCount + 1)) * (pinIndex + 1)
      );
    }

    throw Error(`pin: ${pinId} not found in node: ${node.id}`);
  }
}
