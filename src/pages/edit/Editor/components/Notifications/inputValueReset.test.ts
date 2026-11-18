import { describe, expect, it } from "vitest";
import type { CCComponentPinId } from "../../../../../store/componentPin";
import { describeInputValueReset } from "./inputValueReset";

describe("describeInputValueReset", () => {
	it("names each input with the bit width its value no longer fits", () => {
		expect(
			describeInputValueReset({
				inputs: [
					{ componentPinId: "a" as CCComponentPinId, name: "A", bitWidth: 2 },
					{ componentPinId: "b" as CCComponentPinId, name: "B", bitWidth: 1 },
				],
			}),
		).toBe(
			"Input values that no longer fit their bit width were reset to 0: A (2 bit), B (1 bit)",
		);
	});
});
