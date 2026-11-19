import { describe, expect, it } from "vitest";
import { messagesByLanguage } from "../i18n/messages";
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
});
