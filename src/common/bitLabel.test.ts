import { describe, expect, it } from "vitest";
import { stringifySimulationValue } from "../pages/edit/Editor/store/slices/core";
import { bitLabel, valueLabel } from "./bitLabel";

describe("labels of values", () => {
	it("write one bit as ON or OFF", () => {
		expect(bitLabel(true)).toBe("ON");
		expect(bitLabel(false)).toBe("OFF");
		expect(valueLabel([false])).toBe("OFF");
		expect(stringifySimulationValue([true])).toBe("ON");
	});

	it("write more bits as binary digits, and wide ones on a wire in hexadecimal", () => {
		expect(valueLabel([false, true])).toBe("01");
		expect(stringifySimulationValue([true, false, true, true])).toBe("1011");
		expect(stringifySimulationValue([true, false, true, true, true])).toBe(
			"0x17",
		);
	});
});
