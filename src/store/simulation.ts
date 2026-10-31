import { mapValues } from "es-toolkit";
import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type CCStore from ".";
import type { CCComponentId } from "./component";
import type { CCComponentPinId } from "./componentPin";
import type {
	IntrinsicEvaluationEnvironment,
	IntrinsicPinValues,
} from "./intrinsics/base";
import type { CCIntrinsicComponentSpec } from "./intrinsics/types";
import {
	buildSimulationNetlist,
	describeInstance,
	type SimulationInstance,
	type SimulationNetId,
	type SimulationNetlist,
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

/** The values arriving at the input pins of an instance, read from the nets. */
function collectInputs(
	instance: SimulationInstance,
	netValues: ReadonlyMap<SimulationNetId, SimulationValue>,
): IntrinsicPinValues<string> {
	return mapValues(instance.inputShape, (pins) =>
		pins.map((pin) =>
			// The order guarantees that every driver ran first, so a value can only be
			// missing when it was never supplied to an input pin of the component.
			nullthrows(
				netValues.get(pin.netId),
				`No value reaches pin ${pin.nodePinId}`,
			),
		),
	);
}

/** Compute the outputs of one instance in the current time step. */
function evaluateInstance(
	instance: SimulationInstance,
	netValues: ReadonlyMap<SimulationNetId, SimulationValue>,
	previousFrame: SimulationFrame | null,
): IntrinsicPinValues<string> {
	const { behavior } = instance;
	const environment: IntrinsicEvaluationEnvironment<CCIntrinsicComponentSpec> =
		{
			outputBitWidths: mapValues(instance.outputShape, (pins) =>
				pins.map((pin) => pin.bitWidth),
			),
			config: instance.config,
		};
	try {
		if (behavior.kind === "sequential") {
			return behavior.evaluate(
				previousFrame && collectInputs(instance, previousFrame.netValues),
				environment,
			);
		}
		return behavior.evaluate(collectInputs(instance, netValues), environment);
	} catch (error) {
		// The evaluation functions only see values, so tell which node they belong to
		throw new Error(
			`${describeInstance(instance)} could not be evaluated: ${
				error instanceof Error ? error.message : String(error)
			}`,
			{ cause: error },
		);
	}
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
		const outputs = evaluateInstance(instance, netValues, previousFrame);
		for (const [key, pins] of Object.entries(instance.outputShape)) {
			const values = nullthrows(
				outputs[key],
				`${describeInstance(instance)} did not output ${key}`,
			);
			invariant(
				values.length === pins.length,
				`${describeInstance(instance)} output ${values.length} values for the ${pins.length} pins of ${key}`,
			);
			for (const [index, pin] of pins.entries()) {
				netValues.set(pin.netId, nullthrows(values[index]));
			}
		}
	}

	return new SimulationFrame(netlist, netValues);
}
