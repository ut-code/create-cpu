import { valueLabel } from "../common/bitLabel";
import type { Messages } from "../i18n";
import type CCStore from "../store";
import { SimulationNodeError } from "../store/netlist";
import type { CheckResult, WrongOutput } from "./check";

function labelsOf({ inputs, pinName, expected, actual }: WrongOutput) {
	return [
		inputs.map(({ name, value }) => ({ name, value: valueLabel(value) })),
		pinName,
		valueLabel(expected),
		actual ? valueLabel(actual) : null,
	] as const;
}

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
			return texts.wrongOutput(...labelsOf(result));
		case "wrongOutputAtStep":
			return texts.wrongOutputAtStep(result.stepNumber, ...labelsOf(result));
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
