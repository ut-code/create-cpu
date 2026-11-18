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
import type { Tagged } from "type-fest";
import type CCStore from ".";
import type { BitWidthGroupId } from "./bitWidth";
import type { CCComponentId } from "./component";
import type { CCComponentPinId } from "./componentPin";
import type {
	IntrinsicComponentBehavior,
	IntrinsicComponentDefinition,
} from "./intrinsics/base";
import { definitionByComponentId } from "./intrinsics/definitions";
import { ccIntrinsicComponentTypes } from "./intrinsics/types";
import type { CCNode, CCNodeId } from "./node";
import type { CCNodePinId } from "./nodePin";

/**
 * Bit width of a pin of the simulated component that the circuit leaves open. The values
 * fed to such an input pin must be this wide, so whoever supplies them uses it as well.
 */
export const DEFAULT_SIMULATION_BIT_WIDTH = 1;

/** Identity of a net: the key of the terminal driving it. */
export type SimulationNetId = Tagged<string, "SimulationNetId">;

/** Identity of a terminal: the path of its node instance plus its node pin. */
export type SimulationTerminalKey = Tagged<string, "SimulationTerminalKey">;

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
	readonly description: string;
	readonly definition: IntrinsicComponentDefinition;
	readonly config: CCNode["config"];
	/** pins grouped by the pin key of the definition (e.g. `A`, `In`), ordered by pin order */
	readonly inputShape: Record<string, SimulationPinInstance[]>;
	readonly outputShape: Record<string, SimulationPinInstance[]>;
	/** how the outputs are computed, taken from the definition */
	readonly behavior: IntrinsicComponentBehavior;
};

/**
 * The flattened form of a component: every intrinsic node of the component and of the
 * components it uses, in an order where each instance is evaluated after the instances
 * driving its inputs.
 */
export type SimulationNetlist = {
	readonly componentId: CCComponentId;
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

function componentNameOfNode(store: CCStore, nodeId: CCNodeId): string {
	const node = nullthrows(store.nodes.get(nodeId));
	return nullthrows(store.components.get(node.componentId)).name;
}

function isInterfaceNode(store: CCStore, nodeId: CCNodeId): boolean {
	const node = nullthrows(store.nodes.get(nodeId));
	const { intrinsicType } = nullthrows(store.components.get(node.componentId));
	return (
		intrinsicType === ccIntrinsicComponentTypes.INPUT ||
		intrinsicType === ccIntrinsicComponentTypes.OUTPUT
	);
}

function nameOfNode(store: CCStore, nodeId: CCNodeId): string {
	const componentName = componentNameOfNode(store, nodeId);
	if (!isInterfaceNode(store, nodeId)) return componentName;
	const exposedPin = store.nodePins
		.getManyByNodeId(nodeId)
		.map((nodePin) => store.componentPins.getByImplementation(nodePin.id))
		.find((componentPin) => componentPin !== undefined);
	return exposedPin ? `${componentName} ${exposedPin.name}` : componentName;
}

/** From the inside out, e.g. `Xor in HalfAdder` for a Xor inside a HalfAdder node */
export function describeNodePath(
	store: CCStore,
	path: readonly CCNodeId[],
): string {
	return path
		.map((nodeId) => nameOfNode(store, nodeId))
		.reverse()
		.join(" in ");
}

function commonPrefixOf(
	paths: readonly (readonly CCNodeId[])[],
): readonly CCNodeId[] {
	const [first = [], ...rest] = paths;
	let length = 0;
	while (
		length < first.length &&
		rest.every((path) => path[length] === first[length])
	)
		length += 1;
	return first.slice(0, length);
}

export class SimulationNodeError extends Error {
	constructor(
		message: string,
		readonly nodePaths: readonly (readonly CCNodeId[])[],
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = "SimulationNodeError";
	}
}

/**
 * Thrown when the nodes of a loop wait for each other's values. The nodes are not
 * listed, as a loop can be long, but outlined by the editor.
 */
export class SimulationCombinationalLoopError extends SimulationNodeError {
	constructor(store: CCStore, loop: readonly (readonly CCNodeId[])[]) {
		const owner = commonPrefixOf(loop);
		const ownerNodeId = owner.at(-1);
		const isInsideOwner = loop.every((path) => path.length > owner.length);
		super(
			ownerNodeId !== undefined && isInsideOwner
				? `There is a loop inside ${describeNodePath(store, owner)}, so the values in it cannot be determined. Open ${componentNameOfNode(store, ownerNodeId)} to fix the connections, or add a FlipFlop to the loop if the value should feed back.`
				: "The outlined nodes form a loop, so their values cannot be determined. Fix the connections in the loop, or add a FlipFlop to it if the value should feed back.",
			loop,
		);
		this.name = "SimulationCombinationalLoopError";
	}
}

/** Thrown when an input pin has nothing connected to it. */
export class SimulationUnconnectedPinError extends SimulationNodeError {
	constructor(
		store: CCStore,
		nodePath: readonly CCNodeId[],
		nodePinId: CCNodePinId,
	) {
		const nodeName = describeNodePath(store, nodePath);
		const nodePin = nullthrows(store.nodePins.get(nodePinId));
		const pinName = nullthrows(
			store.componentPins.get(nodePin.componentPinId),
		).name;
		const ownerNodeId = nodePath.at(-2);
		const hint =
			ownerNodeId === undefined
				? ""
				: ` Open ${componentNameOfNode(store, ownerNodeId)} to connect it.`;
		super(
			isInterfaceNode(store, nullthrows(nodePath.at(-1)))
				? `${nodeName} is not connected.${hint}`
				: `Input pin ${pinName} of ${nodeName} is not connected.${hint}`,
			[nodePath],
		);
		this.name = "SimulationUnconnectedPinError";
	}
}

/**
 * Thrown when the pins tied together in a component fix different bit widths. The
 * editor highlights the connections between them.
 */
export class SimulationBitWidthConflictError extends SimulationNodeError {
	/** @param nodePath empty for the simulated component itself */
	constructor(
		readonly componentId: CCComponentId,
		componentName: string,
		nodePath: readonly CCNodeId[],
	) {
		const fix =
			nodePath.length === 0
				? "Fix the highlighted connections."
				: `Open ${componentName} to fix the highlighted connections.`;
		super(
			`The bit widths of some connected pins in ${componentName} do not match. ${fix}`,
			nodePath.length === 0 ? [] : [nodePath],
		);
		this.name = "SimulationBitWidthConflictError";
	}
}

/**
 * The bit widths that the surroundings of a node instance give to the groups inside its
 * component that do not fix a width by themselves.
 */
type BitWidthByGroup = ReadonlyMap<BitWidthGroupId, number>;

/**
 * Flatten `componentId` into intrinsic node instances and the nets between them.
 * @param store store to read the circuit from
 * @param componentId component to flatten
 * @param defaultBitWidth bit width of the pins whose width neither the circuit nor the
 *   pins of the component around them fix
 * @returns the flattened netlist, ready to be evaluated time step by time step
 */
export function buildSimulationNetlist(
	store: CCStore,
	componentId: CCComponentId,
	defaultBitWidth = DEFAULT_SIMULATION_BIT_WIDTH,
): SimulationNetlist {
	const netByTerminal = new Map<SimulationTerminalKey, SimulationNetId>();
	const instances: SimulationInstance[] = [];

	/**
	 * The next pin towards the one driving a pin, hopping over the `Input` and `Output`
	 * nodes and the component nodes in between, or `null` if the pin drives its net.
	 */
	const stepToDriver = (
		path: readonly CCNodeId[],
		nodePinId: CCNodePinId,
	): { path: readonly CCNodeId[]; nodePinId: CCNodePinId } | null => {
		const nodePin = nullthrows(store.nodePins.get(nodePinId));
		const node = nullthrows(store.nodes.get(nodePin.nodeId));
		const componentPin = nullthrows(
			store.componentPins.get(nodePin.componentPinId),
		);
		const component = nullthrows(store.components.get(node.componentId));

		if (componentPin.type === "input") {
			// An input pin is driven by a connection inside the component it sits in
			const connection = store.connections
				.getConnectionsByNodePinId(nodePinId)
				.find((candidate) => candidate.to === nodePinId);
			if (!connection) {
				throw new SimulationUnconnectedPinError(store, path, nodePinId);
			}
			const sourceNodePin = nullthrows(store.nodePins.get(connection.from));
			return {
				path: [...path.slice(0, -1), sourceNodePin.nodeId],
				nodePinId: sourceNodePin.id,
			};
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
			return { path: path.slice(0, -1), nodePinId: outerNodePin.id };
		}

		if (!component.intrinsicType) {
			// Driven from inside the component, by the node implementing the pin
			const implementation = nullthrows(
				componentPin.implementation,
				`Pin ${componentPin.id} of a user-defined component has no implementation`,
			);
			const innerNodePin = nullthrows(store.nodePins.get(implementation));
			return {
				path: [...path, innerNodePin.nodeId],
				nodePinId: innerNodePin.id,
			};
		}

		// An output pin of an intrinsic node, or of an `Input` node of the simulated
		// component itself
		return null;
	};

	/** Find the net of a pin, and remember it for every pin walked on the way. */
	const resolveNet = (
		startPath: readonly CCNodeId[],
		startNodePinId: CCNodePinId,
	): SimulationNetId => {
		const visited: SimulationTerminalKey[] = [];
		const visitedKeys = new Set<SimulationTerminalKey>();
		const visitedPaths: (readonly CCNodeId[])[] = [];
		let at: ReturnType<typeof stepToDriver> = {
			path: startPath,
			nodePinId: startNodePinId,
		};
		let netId: SimulationNetId | null = null;
		while (at) {
			const terminal = simulationTerminalKey(at.path, at.nodePinId);
			const known = netByTerminal.get(terminal);
			if (known) {
				netId = known;
				break;
			}
			if (visitedKeys.has(terminal)) {
				throw new SimulationCombinationalLoopError(
					store,
					visitedPaths.slice(visited.indexOf(terminal)),
				);
			}
			visited.push(terminal);
			visitedKeys.add(terminal);
			visitedPaths.push(at.path);
			at = stepToDriver(at.path, at.nodePinId);
		}
		netId ??= nullthrows(visited.at(-1)) as string as SimulationNetId;
		for (const terminal of visited) netByTerminal.set(terminal, netId);
		return netId;
	};

	/** Only for pins already resolved, whose walk is known to end at a driver */
	const walkToDriver = (
		path: readonly CCNodeId[],
		nodePinId: CCNodePinId,
	): (readonly CCNodeId[])[] => {
		const paths: (readonly CCNodeId[])[] = [];
		for (
			let at: ReturnType<typeof stepToDriver> = { path, nodePinId };
			at;
			at = stepToDriver(at.path, at.nodePinId)
		)
			paths.push(at.path);
		return paths;
	};

	/** Resolve the pins of one intrinsic node instance, grouped by definition pin key. */
	const resolveShape = (
		path: readonly CCNodeId[],
		nodeId: CCNodeId,
		pinByKey: Record<string, { readonly id: CCComponentPinId }>,
		getBitWidth: (nodePinId: CCNodePinId) => number,
	): Record<string, SimulationPinInstance[]> => {
		const shape: Record<string, SimulationPinInstance[]> = {};
		for (const [key, componentPin] of Object.entries(pinByKey)) {
			shape[key] = store.nodePins
				.getManyByNodeIdAndComponentPinId(nodeId, componentPin.id)
				.toSorted((a, b) => a.order - b.order)
				.map((nodePin) => ({
					nodePinId: nodePin.id,
					netId: resolveNet(path, nodePin.id),
					bitWidth: getBitWidth(nodePin.id),
				}));
		}
		return shape;
	};

	const visit = (
		path: readonly CCNodeId[],
		ownerComponentId: CCComponentId,
		bitWidthByGroup: BitWidthByGroup,
		componentStack: readonly CCComponentId[],
	) => {
		invariant(
			!componentStack.includes(ownerComponentId),
			`Component ${ownerComponentId} contains itself`,
		);
		const bitWidths = store.nodePins.getComponentBitWidths(ownerComponentId);
		if (bitWidths.hasConflict()) {
			const ownerComponent = nullthrows(store.components.get(ownerComponentId));
			throw new SimulationBitWidthConflictError(
				ownerComponentId,
				ownerComponent.name,
				path,
			);
		}
		/** a group fixing no width takes it from the surroundings, or else the default */
		const getBitWidth = (nodePinId: CCNodePinId): number => {
			const status = bitWidths.getStatus(nodePinId);
			if (status.isFixed) return status.bitWidth;
			return (
				bitWidthByGroup.get(bitWidths.getGroup(nodePinId)) ?? defaultBitWidth
			);
		};
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
					throw new SimulationUnconnectedPinError(store, nodePath, nodePin.id);
				}
			}

			const component = nullthrows(store.components.get(node.componentId));
			if (!component.intrinsicType) {
				// Each pin of the node hands its width to the group of its implementation
				const childBitWidths = store.nodePins.getComponentBitWidths(
					node.componentId,
				);
				const childBitWidthByGroup = new Map<BitWidthGroupId, number>();
				for (const nodePin of store.nodePins.getManyByNodeId(node.id)) {
					const implementation = nullthrows(
						nullthrows(store.componentPins.get(nodePin.componentPinId))
							.implementation,
						`Pin ${nodePin.componentPinId} of a user-defined component has no implementation`,
					);
					childBitWidthByGroup.set(
						childBitWidths.getGroup(implementation),
						getBitWidth(nodePin.id),
					);
				}
				visit(nodePath, node.componentId, childBitWidthByGroup, [
					...componentStack,
					ownerComponentId,
				]);
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
			const behavior = nullthrows(
				definition.behavior,
				`Intrinsic component ${definition.name} cannot be evaluated`,
			);
			instances.push({
				path: nodePath,
				nodeId: node.id,
				description: describeNodePath(store, nodePath),
				definition,
				config: node.config,
				inputShape: resolveShape(
					nodePath,
					node.id,
					definition.inputPin,
					getBitWidth,
				),
				outputShape: resolveShape(
					nodePath,
					node.id,
					definition.outputPin,
					getBitWidth,
				),
				behavior,
			});
		}
	};
	visit([], componentId, new Map(), []);

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

	const ordering = sortInstancesByDependency(instances);
	if ("loop" in ordering) {
		// The wires between the instances tell the levels the loop runs through
		const { loop } = ordering;
		const wirePaths = loop.slice(1).flatMap((consumer, index) => {
			const driver = nullthrows(loop[index]);
			const driverNetIds = new Set(
				simulationPinsOfShape(driver.outputShape).map((pin) => pin.netId),
			);
			return simulationPinsOfShape(consumer.inputShape)
				.filter((pin) => driverNetIds.has(pin.netId))
				.flatMap((pin) => walkToDriver(consumer.path, pin.nodePinId));
		});
		throw new SimulationCombinationalLoopError(store, wirePaths);
	}

	return {
		componentId,
		instances: ordering.sorted,
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

/**
 * Order the instances so that each one comes after the instances driving its inputs.
 * A sequential instance derives its outputs from the previous time step, so it does not
 * wait for its own inputs and is what allows a circuit to contain a loop at all.
 * @returns the order, or a loop of instances containing no sequential one
 */
function sortInstancesByDependency(
	instances: readonly SimulationInstance[],
): { sorted: SimulationInstance[] } | { loop: SimulationInstance[] } {
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
		if (instance.behavior.kind === "sequential") continue;
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
		return {
			loop: findLoop(successors, stuck).map((index) =>
				nullthrows(instances[index]),
			),
		};
	}
	return { sorted };
}

/** One loop among the instances that could not be ordered, closed by its first one */
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
	invariant(false, "Every instance left unordered waits for another one");
}
