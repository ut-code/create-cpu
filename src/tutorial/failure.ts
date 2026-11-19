import { valueLabel } from "../common/bitLabel";
import type { Messages } from "../i18n";
import type CCStore from "../store";
import { SimulationNodeError } from "../store/netlist";
import type { CheckResult } from "./check";

export function describeFailure(
	result: Exclude<CheckResult, { type: "passed" }>,
	store: CCStore,
	messages: Messages,
): string {
	const texts = messages.tutorial;
	switch (result.type) {
		case "missingPin":
			return texts.missingPin(result.pinType, result.pinName);
		case "wrongBitWidth":
			return texts.wrongBitWidth(
				result.pinName,
				result.expected,
				result.actual,
			);
		case "wrongOutput":
			return texts.wrongOutput(
				result.inputs.map(({ name, value }) => ({
					name,
					value: valueLabel(value),
				})),
				result.pinName,
				valueLabel(result.expected),
				result.actual ? valueLabel(result.actual) : null,
			);
		case "wrongOutputAtStep":
			return texts.wrongOutputAtStep(
				result.stepNumber,
				result.inputs.map(({ name, value }) => ({
					name,
					value: valueLabel(value),
				})),
				result.pinName,
				valueLabel(result.expected),
				result.actual ? valueLabel(result.actual) : null,
			);
		case "checkFailed":
			return texts.checkFailed;
		case "simulationFailed":
			return texts.simulationFailed(
				result.error instanceof SimulationNodeError
					? result.error.describe(store, messages.simulation)
					: result.error instanceof Error
						? result.error.message
						: String(result.error),
			);
	}
}
