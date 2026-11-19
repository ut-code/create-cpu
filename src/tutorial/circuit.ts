import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { Vector2 } from "../common/vector2";
import type CCStore from "../store";
import type { CCComponentId } from "../store/component";
import { CCConnectionStore } from "../store/connection";
import { type CCNode, CCNodeStore } from "../store/node";
import type { CCNodePinId } from "../store/nodePin";

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

	place(componentId: CCComponentId, position: Vector2): CCNode {
		const node = CCNodeStore.create({
			parentComponentId: this.componentId,
			componentId,
			position,
		});
		this.store.nodes.register(node);
		return node;
	}

	pinOf(node: CCNode, name: string): CCNodePinId {
		const nodePin = this.store.nodePins
			.getManyByNodeId(node.id)
			.find(
				(pin) =>
					this.store.componentPins.get(pin.componentPinId)?.name === name,
			);
		return nullthrows(nodePin, `The node has no pin named ${name}`).id;
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
