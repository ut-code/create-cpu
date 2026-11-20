import { describe, expect, it } from "vitest";
import { messagesByLanguage } from "../i18n/messages";
import { SimulationNodeError } from "../store/netlist";
import { createTestStore } from "../store/testUtils";
import { describeFailure } from "./failure";

describe("describeFailure", () => {
	it("tells the time step and its inputs for an output wrong at a step", () => {
		expect(
			describeFailure(
				{
					type: "wrongOutputAtStep",
					stepNumber: 3,
					inputs: [{ name: "Start", value: [true] }],
					pinName: "Count",
					expected: [false, false, true, true],
					actual: [false, false, true, false],
				},
				createTestStore(),
				messagesByLanguage.ja,
			),
		).toBe(
			"3 ステップ目（Start が ON）に、Count が 0011 のはずが 0010 でした。",
		);
	});

	it("gives a worded simulation error as it is", () => {
		class WordedError extends SimulationNodeError {
			override get isWorded() {
				return true;
			}
		}
		expect(
			describeFailure(
				{
					type: "simulationFailed",
					error: new WordedError("Output Out is not connected.", []),
				},
				createTestStore(),
				messagesByLanguage.en,
			),
		).toBe("Output Out is not connected.");
	});

	it.each([
		new Error("Broken"),
		new SimulationNodeError("And could not be evaluated", []),
	])(
		"says the circuit cannot run before an error without a wording",
		(error) => {
			expect(
				describeFailure(
					{ type: "simulationFailed", error },
					createTestStore(),
					messagesByLanguage.ja,
				),
			).toBe(`回路を動かせません。${error.message}`);
		},
	);
});
