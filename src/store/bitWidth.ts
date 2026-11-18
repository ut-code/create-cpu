/**
 * Bit widths of the pins of a component.
 *
 * The pins that always carry values of the same width form a **bit width group**. Within
 * one component, two pins share a group when
 *
 * - a connection ties them together,
 * - they are inferred pins of the same intrinsic node (e.g. `A`, `B` and `Out` of `And`),
 *   or
 * - they are pins of the same user-defined node whose implementations share a group
 *   inside that component (e.g. the input and output of a component passing a value
 *   through). Pins of independent paths inside it stay in separate groups.
 *
 * Some pins fix their own width: a configurable pin by its manual bit width, a calculated
 * pin by the config of its node, and a pin of a user-defined node by the group of its
 * implementation when that group is fixed. A group takes the width its pins fix. When
 * they fix more than one width, the group is in **conflict**: its connections cannot
 * carry a value, so the editor highlights them and the simulation refuses to run.
 */

import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { Tagged } from "type-fest";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import type { CCNodePinBitWidthStatus } from "./componentPin";
import { IntrinsicComponentDefinition } from "./intrinsics/base";
import type { CCNodePin, CCNodePinId } from "./nodePin";

/** Identity of a bit width group: the id of one pin representing it. */
export type BitWidthGroupId = Tagged<string, "BitWidthGroupId">;

/** The bit width of a node pin of a configurable component pin. */
function requireManualBitWidth(nodePin: CCNodePin): number {
	invariant(
		nodePin.manualBitWidth !== null && nodePin.manualBitWidth > 0,
		`Node pin ${nodePin.id} of a configurable component pin must have a positive manual bit width, but got ${nodePin.manualBitWidth}`,
	);
	return nodePin.manualBitWidth;
}

/**
 * Collect the manually specified bit widths of the pins of a single node, grouped by
 * the pin key of its intrinsic component definition (e.g. `In`, `Out`) and ordered by
 * the order of the node pins.
 * @param nodePins all pins of one node
 * @returns the bit widths of the pins of configurable component pins
 */
function collectManualBitWidths(
	nodePins: readonly CCNodePin[],
): Partial<Record<string, number[]>> {
	const manualBitWidths: Partial<Record<string, number[]>> = {};
	for (const nodePin of nodePins.toSorted((a, b) => a.order - b.order)) {
		const attributes = IntrinsicComponentDefinition.getPinAttributesByPinId(
			nodePin.componentPinId,
		);
		// Only a configurable pin carries a manual bit width; the others are null
		if (attributes?.bitWidthPolicy.type !== "configurable") continue;
		const bitWidths = manualBitWidths[attributes.key] ?? [];
		bitWidths.push(requireManualBitWidth(nodePin));
		manualBitWidths[attributes.key] = bitWidths;
	}
	return manualBitWidths;
}

/** Disjoint sets of node pins, merged by {@link union}. */
class NodePinUnionFind {
	readonly #parent = new Map<CCNodePinId, CCNodePinId>();

	find(nodePinId: CCNodePinId): CCNodePinId {
		let root = nodePinId;
		for (;;) {
			const parent = this.#parent.get(root);
			if (parent === undefined || parent === root) break;
			root = parent;
		}
		// Compress the path so that later lookups reach the root at once
		let current = nodePinId;
		while (current !== root) {
			const next = nullthrows(this.#parent.get(current));
			this.#parent.set(current, root);
			current = next;
		}
		return root;
	}

	union(a: CCNodePinId, b: CCNodePinId): void {
		const rootA = this.find(a);
		const rootB = this.find(b);
		if (rootA !== rootB) this.#parent.set(rootA, rootB);
	}
}

/** The bit width groups of the pins of the nodes inside one component. */
export class ComponentBitWidths {
	readonly #groupByNodePin: ReadonlyMap<CCNodePinId, BitWidthGroupId>;

	/** the width a pin fixes by itself, regardless of what it is connected to */
	readonly #ownBitWidthByNodePin: ReadonlyMap<CCNodePinId, number>;

	readonly #bitWidthsByGroup: ReadonlyMap<BitWidthGroupId, ReadonlySet<number>>;

	constructor(
		readonly componentId: CCComponentId,
		groupByNodePin: ReadonlyMap<CCNodePinId, BitWidthGroupId>,
		ownBitWidthByNodePin: ReadonlyMap<CCNodePinId, number>,
	) {
		this.#groupByNodePin = groupByNodePin;
		this.#ownBitWidthByNodePin = ownBitWidthByNodePin;
		const bitWidthsByGroup = new Map<BitWidthGroupId, Set<number>>();
		for (const [nodePinId, groupId] of groupByNodePin) {
			let bitWidths = bitWidthsByGroup.get(groupId);
			if (!bitWidths) {
				bitWidths = new Set();
				bitWidthsByGroup.set(groupId, bitWidths);
			}
			const ownBitWidth = ownBitWidthByNodePin.get(nodePinId);
			if (ownBitWidth !== undefined) bitWidths.add(ownBitWidth);
		}
		this.#bitWidthsByGroup = bitWidthsByGroup;
	}

	/** The group of a pin of a node inside the component. */
	getGroup(nodePinId: CCNodePinId): BitWidthGroupId {
		return nullthrows(
			this.#groupByNodePin.get(nodePinId),
			`Node pin ${nodePinId} is not a pin of a node in component ${this.componentId}`,
		);
	}

	/**
	 * The bit width of a pin. A pin fixing its own width keeps it even when its group is
	 * in conflict, because that is the width it produces or expects; the other pins of a
	 * group in conflict have no width to take.
	 */
	getStatus(nodePinId: CCNodePinId): CCNodePinBitWidthStatus {
		const ownBitWidth = this.#ownBitWidthByNodePin.get(nodePinId);
		if (ownBitWidth !== undefined)
			return { isFixed: true, bitWidth: ownBitWidth };
		const bitWidths = this.#getBitWidths(this.getGroup(nodePinId));
		const [bitWidth] = bitWidths;
		return bitWidths.size === 1 && bitWidth !== undefined
			? { isFixed: true, bitWidth }
			: { isFixed: false };
	}

	getGroupBitWidths(nodePinId: CCNodePinId): ReadonlySet<number> {
		return this.#getBitWidths(this.getGroup(nodePinId));
	}

	/** Whether the pins of the group of a pin fix different widths. */
	isInConflict(nodePinId: CCNodePinId): boolean {
		return this.getGroupBitWidths(nodePinId).size > 1;
	}

	/** Whether any group of the component is in conflict. */
	hasConflict(): boolean {
		for (const bitWidths of this.#bitWidthsByGroup.values()) {
			if (bitWidths.size > 1) return true;
		}
		return false;
	}

	/**
	 * Whether two pins may be tied together. It is refused only when it brings a width
	 * into a group that does not have it yet and leaves that group in conflict.
	 *
	 * A group already in conflict may still grow by pins fixing no width, e.g. a node
	 * appended to probe it. They take whatever width the group settles on, so fixing
	 * the original conflict fixes them too. A pin fixing a width of its own is refused
	 * even if the group has that width already, since it would stay in conflict when
	 * the conflict is fixed the other way.
	 */
	canTie(a: CCNodePinId, b: CCNodePinId): boolean {
		const groupA = this.getGroup(a);
		const groupB = this.getGroup(b);
		if (groupA === groupB) return true;
		const bitWidthsA = this.#getBitWidths(groupA);
		const bitWidthsB = this.#getBitWidths(groupB);
		if (bitWidthsA.size === 0 || bitWidthsB.size === 0) return true;
		return new Set([...bitWidthsA, ...bitWidthsB]).size <= 1;
	}

	#getBitWidths(groupId: BitWidthGroupId): ReadonlySet<number> {
		return nullthrows(this.#bitWidthsByGroup.get(groupId));
	}
}

/**
 * Group the pins of the nodes inside a component by bit width.
 * @param store store to read the circuit from
 * @param componentId a user-defined component
 * @param getChildBitWidths the groups of a user-defined component used by a node inside
 * @returns the groups of the component
 */
export function analyzeComponentBitWidths(
	store: CCStore,
	componentId: CCComponentId,
	getChildBitWidths: (componentId: CCComponentId) => ComponentBitWidths,
): ComponentBitWidths {
	const nodes = store.nodes.getManyByParentComponentId(componentId);
	const nodeIds = new Set(nodes.map((node) => node.id));
	const nodePinsByNode = Map.groupBy(
		store.nodePins.getMany().filter((nodePin) => nodeIds.has(nodePin.nodeId)),
		(nodePin) => nodePin.nodeId,
	);

	const unionFind = new NodePinUnionFind();
	const ownBitWidthByNodePin = new Map<CCNodePinId, number>();
	for (const node of nodes) {
		const nodePins = nodePinsByNode.get(node.id) ?? [];
		const component = nullthrows(store.components.get(node.componentId));
		if (component.intrinsicType) {
			let firstInferredNodePin: CCNodePinId | null = null;
			for (const nodePin of nodePins) {
				const attributes = nullthrows(
					IntrinsicComponentDefinition.getPinAttributesByPinId(
						nodePin.componentPinId,
					),
					`Pin ${nodePin.componentPinId} of an intrinsic component has no attributes`,
				);
				const policy = attributes.bitWidthPolicy;
				switch (policy.type) {
					case "configurable":
						ownBitWidthByNodePin.set(
							nodePin.id,
							requireManualBitWidth(nodePin),
						);
						break;
					case "calculated":
						ownBitWidthByNodePin.set(
							nodePin.id,
							policy.calculateBitWidth(
								node.config,
								collectManualBitWidths(nodePins),
							),
						);
						break;
					case "inferred":
						// The inferred pins of an intrinsic node all carry the same width
						if (firstInferredNodePin === null)
							firstInferredNodePin = nodePin.id;
						else unionFind.union(firstInferredNodePin, nodePin.id);
						break;
					default:
						throw new Error(
							`Unknown bit width policy: ${policy satisfies never}`,
						);
				}
			}
			continue;
		}

		const childBitWidths = getChildBitWidths(node.componentId);
		/** a pin of this node per group inside the child, to tie the others to */
		const nodePinByChildGroup = new Map<BitWidthGroupId, CCNodePinId>();
		for (const nodePin of nodePins) {
			const componentPin = nullthrows(
				store.componentPins.get(nodePin.componentPinId),
			);
			const implementation = nullthrows(
				componentPin.implementation,
				`Pin ${componentPin.id} of a user-defined component has no implementation`,
			);
			const implementationStatus = childBitWidths.getStatus(implementation);
			if (implementationStatus.isFixed) {
				ownBitWidthByNodePin.set(nodePin.id, implementationStatus.bitWidth);
				continue;
			}
			const childGroup = childBitWidths.getGroup(implementation);
			const tiedNodePin = nodePinByChildGroup.get(childGroup);
			if (tiedNodePin === undefined) {
				nodePinByChildGroup.set(childGroup, nodePin.id);
			} else {
				unionFind.union(tiedNodePin, nodePin.id);
			}
		}
	}

	for (const connection of store.connections.getManyByParentComponentId(
		componentId,
	)) {
		unionFind.union(connection.from, connection.to);
	}

	const groupByNodePin = new Map<CCNodePinId, BitWidthGroupId>();
	for (const nodePins of nodePinsByNode.values()) {
		for (const nodePin of nodePins) {
			groupByNodePin.set(
				nodePin.id,
				unionFind.find(nodePin.id) as string as BitWidthGroupId,
			);
		}
	}
	return new ComponentBitWidths(
		componentId,
		groupByNodePin,
		ownBitWidthByNodePin,
	);
}
