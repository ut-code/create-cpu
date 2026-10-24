/**
 * Flattening a component for simulation: the hierarchy is resolved into the intrinsic
 * nodes the component is built from, and the pins carrying the same value are grouped
 * into nets.
 *
 * - A **terminal** is one pin of one node instance. A component can be used more than
 *   once, so the node pins inside it exist once per use and are only unique together
 *   with the path of node ids leading from the simulated component down to the node the
 *   pin belongs to. {@link simulationTerminalKey} builds the key `path#nodePinId`.
 * - A **net** is the terminals that always carry the same value: the ones tied together
 *   by a connection or by a component boundary.
 * - The **driver** is the one terminal of a net that produces the value, which is either
 *   an output pin of an intrinsic node or the output pin of an `Input` node of the
 *   simulated component itself (a value supplied from the outside). Every other terminal
 *   of the net only receives the value, so the driver identifies the net.
 *
 * In `Const -> Delay(D -> FlipFlop -> Q)`, the value of the constant is one net of four
 * terminals:
 *
 * ```
 * Const#Out              the driver, an output pin of an intrinsic node
 * DelayNode#D            the pin of the node using the component
 * DelayNode/Input#Out    the `Input` node inside the component
 * DelayNode/FlipFlop#In  the pin consuming the value
 * ```
 *
 * `Input` and `Output` nodes only carry a value across a component boundary, so they are
 * resolved away while flattening and never become an instance to evaluate.
 */

import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { Opaque } from "type-fest";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import type { CCComponentPinId } from "./componentPin";
import type { IntrinsicComponentDefinition } from "./intrinsics/base";
import { definitionByComponentId } from "./intrinsics/definitions";
import { ccIntrinsicComponentTypes } from "./intrinsics/types";
import type { CCNode, CCNodeId } from "./node";
import type { CCNodePinId } from "./nodePin";

/** Identity of a net: the key of the terminal driving it. */
export type SimulationNetId = Opaque<string, "SimulationNetId">;

/** Identity of a terminal: the path of its node instance plus its node pin. */
export type SimulationTerminalKey = Opaque<string, "SimulationTerminalKey">;

/**
 * Key of the pin `nodePinId` of the node instance at `path`.
 * @param path node ids from the simulated component down to the node of the pin
 * @param nodePinId id of the node pin
 */
export function simulationTerminalKey(
	path: readonly CCNodeId[],
	nodePinId: CCNodePinId,
): SimulationTerminalKey {
	return `${path.join("/")}#${nodePinId}` as SimulationTerminalKey;
}

/** One pin of an intrinsic node instance, resolved for simulation. */
export type SimulationPinInstance = {
	readonly nodePinId: CCNodePinId;
	/** net the pin is attached to */
	readonly netId: SimulationNetId;
	/** bit width of the pin in this instance */
	readonly bitWidth: number;
};

/**
 * One intrinsic node, instantiated at a concrete place of the component hierarchy.
 * `Input` and `Output` nodes are not instances: they only pass values across a
 * component boundary, so they are resolved away while building the netlist.
 */
export type SimulationInstance = {
	/** node ids from the simulated component down to this node */
	readonly path: readonly CCNodeId[];
	readonly nodeId: CCNodeId;
	readonly definition: IntrinsicComponentDefinition;
	readonly config: CCNode["config"];
	/** bit width used for the pins of this instance whose width is not fixed */
	readonly defaultBitWidth: number;
	/** pins grouped by the pin key of the definition (e.g. `A`, `In`), ordered by pin order */
	readonly inputShape: Record<string, SimulationPinInstance[]>;
	readonly outputShape: Record<string, SimulationPinInstance[]>;
	/** whether the outputs are derived from the previous time step instead of the inputs */
	readonly isSequential: boolean;
};

/**
 * The flattened form of a component: every intrinsic node of the component and of the
 * components it uses, in an order where each instance is evaluated after the instances
 * driving its inputs.
 */
export type SimulationNetlist = {
	readonly componentId: CCComponentId;
	/** revision of the store this netlist was built from */
	readonly revision: number;
	readonly instances: readonly SimulationInstance[];
	/** net driven by each input pin of the simulated component */
	readonly netByInputComponentPin: ReadonlyMap<
		CCComponentPinId,
		SimulationNetId
	>;
	/** net of each node pin of the nodes of the simulated component itself */
	readonly netByNodePin: ReadonlyMap<CCNodePinId, SimulationNetId>;
	/**
	 * Net of the pins that were resolved while flattening: every pin of the nodes of the
	 * simulated component and of the intrinsic instances inside it, plus the pins of the
	 * `Input`, `Output` and component nodes on the way between them.
	 */
	readonly netByTerminal: ReadonlyMap<SimulationTerminalKey, SimulationNetId>;
};

/**
 * Thrown when a value would have to be known before it can be computed. Such a loop
 * can only be resolved by a node that holds its value for one time step, so the fix is
 * to insert a `FlipFlop` somewhere along the reported path.
 */
export class SimulationCombinationalLoopError extends Error {
	constructor(readonly loop: readonly string[]) {
		super(
			`Combinational loop detected: ${loop.join(" -> ")}. Insert a FlipFlop to break it.`,
		);
		this.name = "SimulationCombinationalLoopError";
	}
}

/** Thrown when an input pin has nothing connected to it. */
export class SimulationUnconnectedPinError extends Error {
	constructor(
		readonly nodeId: CCNodeId,
		readonly nodePinId: CCNodePinId,
	) {
		super(`Input pin ${nodePinId} of node ${nodeId} is not connected.`);
		this.name = "SimulationUnconnectedPinError";
	}
}

/**
 * The bit width the pins of a node instance fall back to when their own width is not
 * fixed. It is inherited from the pin of the node whose width the surrounding circuit
 * has already fixed, which is how a component written for one bit width can be reused
 * for another.
 */
function resolveInstanceDefaultBitWidth(
	store: CCStore,
	node: CCNode,
	parentDefaultBitWidth: number,
): number {
	for (const nodePin of store.nodePins.getManyByNodeId(node.id)) {
		const componentPinBitWidthStatus =
			store.componentPins.getComponentPinBitWidthStatus(nodePin.componentPinId);
		if (
			!componentPinBitWidthStatus.isFixed &&
			componentPinBitWidthStatus.fixMode === "automatic"
		) {
			const nodePinBitWidthStatus = store.nodePins.getNodePinBitWidthStatus(
				nodePin.id,
			);
			if (nodePinBitWidthStatus.isFixed) {
				return nodePinBitWidthStatus.bitWidth;
			}
		}
	}
	return parentDefaultBitWidth;
}

/**
 * Flatten `componentId` into intrinsic node instances and the nets between them.
 * @param store store to read the circuit from
 * @param componentId component to flatten
 * @param defaultBitWidth bit width of the pins of the component whose width is not fixed
 * @returns the flattened netlist, ready to be evaluated time step by time step
 */
export function buildSimulationNetlist(
	store: CCStore,
	componentId: CCComponentId,
	defaultBitWidth = 1,
): SimulationNetlist {
	const netByTerminal = new Map<SimulationTerminalKey, SimulationNetId>();
	const instances: SimulationInstance[] = [];

	/**
	 * Walk from a pin to the pin driving it, hopping over the `Input` and `Output` nodes
	 * and the component nodes in between, and remember the net for every pin on the way.
	 */
	const resolveNet = (
		startPath: readonly CCNodeId[],
		startNodePinId: CCNodePinId,
	): SimulationNetId => {
		const visited: SimulationTerminalKey[] = [];
		const visitedKeys = new Set<SimulationTerminalKey>();
		/** the nodes walked through so far, for the error message of a loop */
		const visitedNodes: string[] = [];
		let path = startPath;
		let nodePinId = startNodePinId;
		let netId: SimulationNetId | null = null;
		while (netId === null) {
			const terminal = simulationTerminalKey(path, nodePinId);
			const known = netByTerminal.get(terminal);
			if (known) {
				netId = known;
				break;
			}
			if (visitedKeys.has(terminal)) {
				throw new SimulationCombinationalLoopError(visitedNodes);
			}
			visited.push(terminal);
			visitedKeys.add(terminal);

			const nodePin = nullthrows(store.nodePins.get(nodePinId));
			const node = nullthrows(store.nodes.get(nodePin.nodeId));
			const componentPin = nullthrows(
				store.componentPins.get(nodePin.componentPinId),
			);
			const component = nullthrows(store.components.get(node.componentId));
			const walkedNode = `${component.name}(${path.join("/")})`;
			if (visitedNodes.at(-1) !== walkedNode) visitedNodes.push(walkedNode);

			if (componentPin.type === "input") {
				// An input pin is driven by a connection inside the component it sits in
				const connection = store.connections
					.getConnectionsByNodePinId(nodePinId)
					.find((candidate) => candidate.to === nodePinId);
				if (!connection) {
					throw new SimulationUnconnectedPinError(node.id, nodePinId);
				}
				const sourceNodePin = nullthrows(store.nodePins.get(connection.from));
				path = [...path.slice(0, -1), sourceNodePin.nodeId];
				nodePinId = sourceNodePin.id;
				continue;
			}

			if (
				component.intrinsicType === ccIntrinsicComponentTypes.INPUT &&
				path.length > 1
			) {
				// Fed from the pin of the node that uses the component this node sits in
				const boundaryPin = nullthrows(
					store.componentPins.getByImplementation(nodePinId),
					`Input node ${node.id} does not expose a component pin`,
				);
				const outerNodeId = nullthrows(path[path.length - 2]);
				const outerNodePin = nullthrows(
					store.nodePins
						.getManyByNodeId(outerNodeId)
						.find((candidate) => candidate.componentPinId === boundaryPin.id),
					`Node ${outerNodeId} is missing the pin of ${boundaryPin.id}`,
				);
				path = path.slice(0, -1);
				nodePinId = outerNodePin.id;
				continue;
			}

			if (!component.intrinsicType) {
				// Driven from inside the component, by the node implementing the pin
				const implementation = nullthrows(
					componentPin.implementation,
					`Pin ${componentPin.id} of a user-defined component has no implementation`,
				);
				const innerNodePin = nullthrows(store.nodePins.get(implementation));
				path = [...path, innerNodePin.nodeId];
				nodePinId = innerNodePin.id;
				continue;
			}

			// An output pin of an intrinsic node, or of an `Input` node of the simulated
			// component itself: the value originates here, so this pin drives the net.
			netId = terminal as string as SimulationNetId;
		}
		for (const terminal of visited) netByTerminal.set(terminal, netId);
		return netId;
	};

	/** Resolve the pins of one intrinsic node instance, grouped by definition pin key. */
	const resolveShape = (
		path: readonly CCNodeId[],
		nodeId: CCNodeId,
		pinByKey: Record<string, { readonly id: CCComponentPinId }>,
		instanceDefaultBitWidth: number,
	): Record<string, SimulationPinInstance[]> => {
		const shape: Record<string, SimulationPinInstance[]> = {};
		for (const [key, componentPin] of Object.entries(pinByKey)) {
			shape[key] = store.nodePins
				.getManyByNodeIdAndComponentPinId(nodeId, componentPin.id)
				.toSorted((a, b) => a.order - b.order)
				.map((nodePin) => {
					const bitWidthStatus = store.nodePins.getNodePinBitWidthStatus(
						nodePin.id,
					);
					return {
						nodePinId: nodePin.id,
						netId: resolveNet(path, nodePin.id),
						bitWidth: bitWidthStatus.isFixed
							? bitWidthStatus.bitWidth
							: instanceDefaultBitWidth,
					};
				});
		}
		return shape;
	};

	const visit = (
		path: readonly CCNodeId[],
		ownerComponentId: CCComponentId,
		instanceDefaultBitWidth: number,
		componentStack: readonly CCComponentId[],
	) => {
		invariant(
			!componentStack.includes(ownerComponentId),
			`Component ${ownerComponentId} contains itself`,
		);
		for (const node of store.nodes.getManyByParentComponentId(
			ownerComponentId,
		)) {
			const nodePath = [...path, node.id];
			for (const nodePin of store.nodePins.getManyByNodeId(node.id)) {
				const componentPin = nullthrows(
					store.componentPins.get(nodePin.componentPinId),
				);
				if (
					componentPin.type === "input" &&
					store.connections.getConnectionsByNodePinId(nodePin.id).length === 0
				) {
					throw new SimulationUnconnectedPinError(node.id, nodePin.id);
				}
			}

			const component = nullthrows(store.components.get(node.componentId));
			if (!component.intrinsicType) {
				visit(
					nodePath,
					node.componentId,
					resolveInstanceDefaultBitWidth(store, node, instanceDefaultBitWidth),
					[...componentStack, ownerComponentId],
				);
				continue;
			}
			if (
				component.intrinsicType === ccIntrinsicComponentTypes.INPUT ||
				component.intrinsicType === ccIntrinsicComponentTypes.OUTPUT
			) {
				continue; // resolved away as part of the nets crossing the boundary
			}

			const definition = nullthrows(
				definitionByComponentId.get(node.componentId),
				`Intrinsic component ${node.componentId} has no definition`,
			);
			instances.push({
				path: nodePath,
				nodeId: node.id,
				definition,
				config: node.config,
				defaultBitWidth: instanceDefaultBitWidth,
				inputShape: resolveShape(
					nodePath,
					node.id,
					definition.inputPin,
					instanceDefaultBitWidth,
				),
				outputShape: resolveShape(
					nodePath,
					node.id,
					definition.outputPin,
					instanceDefaultBitWidth,
				),
				isSequential: definition.isSequential,
			});
		}
	};
	visit([], componentId, defaultBitWidth, []);

	// Nets of the pins the editor renders, and of the values supplied from the outside
	const netByNodePin = new Map<CCNodePinId, SimulationNetId>();
	for (const node of store.nodes.getManyByParentComponentId(componentId)) {
		for (const nodePin of store.nodePins.getManyByNodeId(node.id)) {
			netByNodePin.set(nodePin.id, resolveNet([node.id], nodePin.id));
		}
	}
	const netByInputComponentPin = new Map<CCComponentPinId, SimulationNetId>();
	for (const componentPin of store.componentPins.getManyByComponentId(
		componentId,
	)) {
		if (componentPin.type !== "input") continue;
		const implementation = nullthrows(
			componentPin.implementation,
			`Pin ${componentPin.id} of a simulated component has no implementation`,
		);
		const nodePin = nullthrows(store.nodePins.get(implementation));
		netByInputComponentPin.set(
			componentPin.id,
			resolveNet([nodePin.nodeId], nodePin.id),
		);
	}

	return {
		componentId,
		revision: store.revision,
		instances: sortInstancesByDependency(instances),
		netByInputComponentPin,
		netByNodePin,
		netByTerminal,
	};
}

/** Every pin of a shape, with the grouping by pin key flattened away. */
export function simulationPinsOfShape(
	shape: Record<string, SimulationPinInstance[]>,
): SimulationPinInstance[] {
	return Object.values(shape).flat();
}

function describeInstance(instance: SimulationInstance): string {
	return `${instance.definition.name}(${instance.path.join("/")})`;
}

/**
 * Order the instances so that each one comes after the instances driving its inputs.
 * A sequential instance derives its outputs from the previous time step, so it does not
 * wait for its own inputs and is what allows a circuit to contain a loop at all.
 * @throws {SimulationCombinationalLoopError} if a loop contains no sequential instance
 */
function sortInstancesByDependency(
	instances: readonly SimulationInstance[],
): SimulationInstance[] {
	const driverByNet = new Map<SimulationNetId, number>();
	for (const [index, instance] of instances.entries()) {
		for (const pin of simulationPinsOfShape(instance.outputShape)) {
			driverByNet.set(pin.netId, index);
		}
	}

	/** indices of the instances waiting for each net, once per waiting pin */
	const consumersByNet = new Map<SimulationNetId, number[]>();
	const successors = new Map<number, number[]>();
	const remainingDependencies = instances.map(() => 0);
	const appendTo = <Key>(map: Map<Key, number[]>, key: Key, value: number) => {
		const values = map.get(key);
		if (values) values.push(value);
		else map.set(key, [value]);
	};
	for (const [index, instance] of instances.entries()) {
		// A sequential instance answers with the value of the previous time step, so it
		// does not wait for the instances driving its inputs. That is what makes a loop
		// containing one resolvable.
		if (instance.isSequential) continue;
		for (const pin of simulationPinsOfShape(instance.inputShape)) {
			const driver = driverByNet.get(pin.netId);
			if (driver === undefined) continue; // supplied from outside the component
			appendTo(consumersByNet, pin.netId, index);
			appendTo(successors, driver, index);
			remainingDependencies[index] =
				nullthrows(remainingDependencies[index]) + 1;
		}
	}

	const sorted: SimulationInstance[] = [];
	const queue = instances
		.map((_, index) => index)
		.filter((index) => remainingDependencies[index] === 0);
	const settled = new Set<number>(queue);
	while (queue.length > 0) {
		const index = nullthrows(queue.shift());
		const instance = nullthrows(instances[index]);
		sorted.push(instance);
		for (const pin of simulationPinsOfShape(instance.outputShape)) {
			for (const consumer of consumersByNet.get(pin.netId) ?? []) {
				const remaining = nullthrows(remainingDependencies[consumer]) - 1;
				remainingDependencies[consumer] = remaining;
				if (remaining === 0 && !settled.has(consumer)) {
					settled.add(consumer);
					queue.push(consumer);
				}
			}
		}
	}

	if (sorted.length !== instances.length) {
		const stuck = new Set(
			instances.map((_, index) => index).filter((index) => !settled.has(index)),
		);
		throw new SimulationCombinationalLoopError(
			findLoop(successors, stuck).map((index) =>
				describeInstance(nullthrows(instances[index])),
			),
		);
	}
	return sorted;
}

/** Find one loop among the instances that could not be ordered, for the error message. */
function findLoop(
	successors: ReadonlyMap<number, number[]>,
	stuck: ReadonlySet<number>,
): number[] {
	const state = new Map<number, "visiting" | "done">();
	const stack: number[] = [];
	const visit = (index: number): number[] | null => {
		state.set(index, "visiting");
		stack.push(index);
		for (const next of successors.get(index) ?? []) {
			if (!stuck.has(next)) continue;
			if (state.get(next) === "visiting") {
				return [...stack.slice(stack.indexOf(next)), next];
			}
			if (!state.has(next)) {
				const found = visit(next);
				if (found) return found;
			}
		}
		stack.pop();
		state.set(index, "done");
		return null;
	};
	for (const index of stuck) {
		if (state.has(index)) continue;
		const found = visit(index);
		if (found) return found;
	}
	return [...stuck].slice(0, 1);
}
