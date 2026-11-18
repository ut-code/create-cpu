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
	DEFAULT_SIMULATION_BIT_WIDTH,
	type SimulationInstance,
	type SimulationNetId,
	type SimulationNetlist,
	SimulationNodeError,
	type SimulationPinInstance,
	simulationTerminalKey,
} from "./netlist";
import type { CCNodeId } from "./node";
import type { CCNodePinId } from "./nodePin";
import { CCRevisionCache } from "./revisionCache";

export type SimulationValue = boolean[];

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
	CCRevisionCache<string, SimulationNetlist>
>();

/** The netlist of a component, rebuilt whenever the circuit changed since it was built. */
function getSimulationNetlist(
	store: CCStore,
	componentId: CCComponentId,
	defaultBitWidth: number,
): SimulationNetlist {
	let cache = netlistCacheByStore.get(store);
	if (!cache) {
		cache = new CCRevisionCache(store);
		netlistCacheByStore.set(store, cache);
	}
	return cache.get(`${componentId}:${defaultBitWidth}`, () =>
		buildSimulationNetlist(store, componentId, defaultBitWidth),
	);
}

/**
 * Make sure a value is as wide as the pin it passes through. The netlist refuses a
 * circuit whose connected pins disagree on their bit width, so a mismatch here means an
 * intrinsic node or the caller supplying the input values got the width wrong.
 */
function assertValueFitsPin(
	value: SimulationValue,
	pin: SimulationPinInstance,
	instance: SimulationInstance,
	describePin: () => string,
): void {
	if (value.length !== pin.bitWidth) {
		throw new SimulationNodeError(
			`${describePin()} carries ${value.length} bits, but the pin is ${pin.bitWidth} bits wide`,
			[instance.path],
		);
	}
}

/** The values arriving at the input pins of an instance, read from the nets. */
function collectInputs(
	instance: SimulationInstance,
	netValues: ReadonlyMap<SimulationNetId, SimulationValue>,
): IntrinsicPinValues<string> {
	return mapValues(instance.inputShape, (pins, key) =>
		pins.map((pin) => {
			// The order guarantees that every driver ran first, so a value can only be
			// missing when it was never supplied to an input pin of the component.
			const value = nullthrows(
				netValues.get(pin.netId),
				`No value reaches pin ${pin.nodePinId}`,
			);
			assertValueFitsPin(
				value,
				pin,
				instance,
				() => `Input ${key} of ${instance.description}`,
			);
			return value;
		}),
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
	// Collected outside the `try`, since a missing or misfit input already names its pin
	const inputs =
		behavior.kind === "sequential"
			? previousFrame && collectInputs(instance, previousFrame.netValues)
			: collectInputs(instance, netValues);
	try {
		if (behavior.kind === "sequential") {
			return behavior.evaluate(inputs, environment);
		}
		return behavior.evaluate(nullthrows(inputs), environment);
	} catch (error) {
		// The evaluation functions only see values, so tell which node they belong to
		throw new SimulationNodeError(
			`${instance.description} could not be evaluated: ${
				error instanceof Error ? error.message : String(error)
			}`,
			[instance.path],
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
 * @param defaultBitWidth bit width of the pins whose width neither the circuit nor the
 *   pins of the component around them fix
 * @returns the values of this time step
 */
export default function simulateComponent(
	store: CCStore,
	componentId: CCComponentId,
	inputValues: Map<CCComponentPinId, SimulationValue>,
	previousFrame: SimulationFrame | null = null,
	defaultBitWidth = DEFAULT_SIMULATION_BIT_WIDTH,
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
				`${instance.description} did not output ${key}`,
			);
			invariant(
				values.length === pins.length,
				`${instance.description} output ${values.length} values for the ${pins.length} pins of ${key}`,
			);
			for (const [index, pin] of pins.entries()) {
				const value = nullthrows(values[index]);
				assertValueFitsPin(
					value,
					pin,
					instance,
					() => `Output ${key} of ${instance.description}`,
				);
				netValues.set(pin.netId, value);
			}
		}
	}

	return new SimulationFrame(netlist, netValues);
}
