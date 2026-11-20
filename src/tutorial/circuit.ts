import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { Vector2 } from "../common/vector2";
import type CCStore from "../store";
import type { CCComponentId } from "../store/component";
import type { CCComponentPin } from "../store/componentPin";
import { CCConnectionStore } from "../store/connection";
import { type CCNode, CCNodeStore } from "../store/node";
import { type CCNodePinId, CCNodePinStore } from "../store/nodePin";

/** Builds a circuit inside one component, as the editor would when drawn by hand */
export class StageCircuit {
	constructor(
		private readonly store: CCStore,
		readonly componentId: CCComponentId,
	) {}

	/** The pin inside the component behind its own pin `name` */
	pin(name: string): CCNodePinId {
		const componentPin = this.store.componentPins
			.getManyByComponentId(this.componentId)
			.find((pin) => pin.name === name);
		return nullthrows(
			componentPin?.implementation,
			`The component has no pin named ${name}`,
		);
	}

	place(
		componentId: CCComponentId,
		position: Vector2,
		config?: CCNode["config"],
	): CCNode {
		const node = CCNodeStore.create({
			parentComponentId: this.componentId,
			componentId,
			position,
		});
		if (config !== undefined) node.config = config;
		this.store.nodes.register(node);
		return node;
	}

	setBitWidth(node: CCNode, componentPin: CCComponentPin, bitWidth: number) {
		this.split(node, componentPin, [bitWidth]);
	}

	split(node: CCNode, componentPin: CCComponentPin, widths: readonly number[]) {
		const [first, ...rest] = widths;
		const existing = this.store.nodePins.getManyByNodeIdAndComponentPinId(
			node.id,
			componentPin.id,
		);
		invariant(
			first !== undefined && existing.length === 1 && existing[0],
			"Only a pin not split yet can be split",
		);
		this.store.nodePins.update(existing[0].id, { manualBitWidth: first });
		for (const [index, manualBitWidth] of rest.entries()) {
			this.store.nodePins.register(
				CCNodePinStore.create({
					nodeId: node.id,
					componentPinId: componentPin.id,
					order: index + 1,
					manualBitWidth,
				}),
			);
		}
	}

	/**
	 * By name only on a stage's component, as intrinsic pins are named for display.
	 * `index` picks one of the pins a split pin became, from the top.
	 */
	pinOf(node: CCNode, pin: CCComponentPin | string, index = 0): CCNodePinId {
		const nodePin = this.store.nodePins
			.getManyByNodeId(node.id)
			.filter((nodePin) =>
				typeof pin === "string"
					? this.store.componentPins.get(nodePin.componentPinId)?.name === pin
					: nodePin.componentPinId === pin.id,
			)
			.toSorted((a, b) => a.order - b.order)[index];
		return nullthrows(
			nodePin,
			`The node has no pin ${typeof pin === "string" ? pin : pin.name}`,
		).id;
	}

	connect(from: CCNodePinId, to: CCNodePinId): void {
		const rejection = this.store.connections.register(
			CCConnectionStore.create({
				parentComponentId: this.componentId,
				from,
				to,
				bentPortion: 0.5,
			}),
		);
		invariant(!rejection, `The connection was rejected: ${rejection?.type}`);
	}
}
