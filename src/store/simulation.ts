import invariant from "tiny-invariant";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import type { CCComponentPinId } from "./componentPin";
import {
	buildSimulationNetlist,
	type SimulationInstance,
	type SimulationNetId,
	type SimulationNetlist,
	simulationPinsOfShape,
	simulationTerminalKey,
} from "./netlist";
import type { CCNodeId } from "./node";
import type { CCNodePinId } from "./nodePin";

export type SimulationValue = boolean[];

export function wrappingIncrementSimulationValue(
	value: SimulationValue,
): SimulationValue {
	const result = value.slice();
	for (let i = result.length - 1; i >= 0; i--) {
		if (!result[i]) {
			result[i] = true;
			break;
		}
		result[i] = false; // carry the increment
	}
	return result;
}

/**
 * The pin values of a single node instance, shaped like a frame of a whole component so
 * that the evaluation function of an intrinsic component does not have to know how the
 * circuit is flattened for simulation.
 */
export type IntrinsicEvaluationFrame = {
	componentId: CCComponentId;
	nodes: Map<
		CCNodeId,
		{
			pins: Map<CCNodePinId, SimulationValue>;
			/** always null: a flattened instance has no frame of its own */
			child: IntrinsicEvaluationFrame | null;
		}
	>;
};

/**
 * The values of one time step. Every pin that carries the same value shares one net, so
 * a frame stores one value per net and resolves pins through the netlist.
 */
export class SimulationFrame {
	constructor(
		readonly netlist: SimulationNetlist,
		readonly netValues: ReadonlyMap<SimulationNetId, SimulationValue>,
	) {}

	get componentId(): CCComponentId {
		return this.netlist.componentId;
	}

	/**
	 * Value at a pin of a node of the simulated component.
	 * @param nodePinId id of the node pin
	 * @returns the value, or undefined if the pin carries no value in this time step
	 */
	getNodePinValue(nodePinId: CCNodePinId): SimulationValue | undefined {
		const netId = this.netlist.netByNodePin.get(nodePinId);
		return netId === undefined ? undefined : this.netValues.get(netId);
	}

	/**
	 * Value at a pin of a node inside one of the components the simulated component uses.
	 * @param path node ids from the simulated component down to the node of the pin
	 * @param nodePinId id of the node pin
	 */
	getNodePinValueAt(
		path: readonly CCNodeId[],
		nodePinId: CCNodePinId,
	): SimulationValue | undefined {
		const netId = this.netlist.netByTerminal.get(
			simulationTerminalKey(path, nodePinId),
		);
		return netId === undefined ? undefined : this.netValues.get(netId);
	}
}

const netlistCacheByStore = new WeakMap<
	CCStore,
	Map<string, SimulationNetlist>
>();

/**
 * The netlist of a component, rebuilt whenever the store changed since it was built.
 */
function getSimulationNetlist(
	store: CCStore,
	componentId: CCComponentId,
	defaultBitWidth: number,
): SimulationNetlist {
	let cacheByComponent = netlistCacheByStore.get(store);
	if (!cacheByComponent) {
		cacheByComponent = new Map();
		netlistCacheByStore.set(store, cacheByComponent);
	}
	const cacheKey = `${componentId}:${defaultBitWidth}`;
	const cached = cacheByComponent.get(cacheKey);
	if (cached && cached.revision === store.revision) return cached;
	const netlist = buildSimulationNetlist(store, componentId, defaultBitWidth);
	cacheByComponent.set(cacheKey, netlist);
	return netlist;
}

function createEvaluationFrame(
	componentId: CCComponentId,
	nodeId: CCNodeId,
	pins: Map<CCNodePinId, SimulationValue>,
): IntrinsicEvaluationFrame {
	return { componentId, nodes: new Map([[nodeId, { pins, child: null }]]) };
}

/** The pin values this instance had in the previous time step. */
function collectPreviousPins(
	instance: SimulationInstance,
	previousFrame: SimulationFrame,
): Map<CCNodePinId, SimulationValue> {
	const pins = new Map<CCNodePinId, SimulationValue>();
	for (const pin of [
		...simulationPinsOfShape(instance.inputShape),
		...simulationPinsOfShape(instance.outputShape),
	]) {
		const value = previousFrame.netValues.get(pin.netId);
		if (value) pins.set(pin.nodePinId, value);
	}
	return pins;
}

/**
 * Simulate one time step of a component. Every flip-flop of the component and of the
 * components it uses is clocked once, so a flip-flop outputs what its input carried in
 * the previous time step.
 * @param store store to read the circuit from
 * @param componentId component to simulate
 * @param inputValues values supplied to the input pins of the component
 * @param previousFrame the previous time step, or null for the first one
 * @param defaultBitWidth bit width of the pins of the component whose width is not fixed
 * @returns the values of this time step
 */
export default function simulateComponent(
	store: CCStore,
	componentId: CCComponentId,
	inputValues: Map<CCComponentPinId, SimulationValue>,
	previousFrame: SimulationFrame | null = null,
	defaultBitWidth = 1,
): SimulationFrame {
	const netlist = getSimulationNetlist(store, componentId, defaultBitWidth);
	invariant(
		previousFrame === null || previousFrame.netlist === netlist,
		"The previous frame was simulated from another revision of the store",
	);

	const netValues = new Map<SimulationNetId, SimulationValue>();
	for (const [componentPinId, value] of inputValues) {
		const netId = netlist.netByInputComponentPin.get(componentPinId);
		if (netId !== undefined) netValues.set(netId, value);
	}

	for (const instance of netlist.instances) {
		const pins = new Map<CCNodePinId, SimulationValue>();
		for (const pin of simulationPinsOfShape(instance.inputShape)) {
			const value = netValues.get(pin.netId);
			if (value) pins.set(pin.nodePinId, value);
		}
		const succeeded = instance.definition.evaluate(
			{
				previousFrame:
					previousFrame &&
					createEvaluationFrame(
						componentId,
						instance.nodeId,
						collectPreviousPins(instance, previousFrame),
					),
				currentFrame: createEvaluationFrame(componentId, instance.nodeId, pins),
				defaultBitWidth: instance.defaultBitWidth,
			},
			instance.nodeId,
			{ inputShape: instance.inputShape, outputShape: instance.outputShape },
			instance.config,
		);
		if (!succeeded) {
			// The order guarantees that every driver ran first, so a value can only be
			// missing when it was never supplied to an input pin of the component.
			const missing = simulationPinsOfShape(instance.inputShape)
				.filter((pin) => !pins.has(pin.nodePinId))
				.map((pin) => pin.nodePinId);
			throw new Error(
				`Node ${instance.nodeId} (${instance.definition.name}) could not be evaluated. Pins without a value: ${missing.join(", ") || "none"}`,
			);
		}
		for (const pin of simulationPinsOfShape(instance.outputShape)) {
			const value = pins.get(pin.nodePinId);
			if (value) netValues.set(pin.netId, value);
		}
	}

	return new SimulationFrame(netlist, netValues);
}
