import { describe, expect, it } from "vitest";
import { testBits } from "../../../../../store/testUtils";
import { formatSimulationValue, parseSimulationValue } from "./value";

const byteOrderMark = String.fromCodePoint(0xfeff);

describe("formatSimulationValue", () => {
	it("keeps a leading byte order mark in UTF-8", () => {
		for (const [value, expected] of [
			[testBits(0xefbbbf, 24), byteOrderMark],
			[testBits(0xefbbbf41, 32), `${byteOrderMark}A`],
		] as const) {
			const text = formatSimulationValue(value, "utf-8");

			expect(text).toBe(expected);
			expect(parseSimulationValue(text, "utf-8")).toEqual(value);
		}
	});
});
