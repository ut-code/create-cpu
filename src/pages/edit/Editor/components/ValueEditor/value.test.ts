import { describe, expect, it } from "vitest";
import { testBits } from "../../../../../store/testUtils";
import {
	changeSimulationValueDraftMode,
	formatSimulationValue,
	formatSimulationValueDraft,
	parseSimulationValue,
	parseSimulationValueDraft,
} from "./value";

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

describe("SimulationValueDraft", () => {
	it("keeps its value across view mode changes", () => {
		const stored = testBits(0xff, 8);
		let draft = parseSimulationValueDraft("101", "binary");

		draft = changeSimulationValueDraftMode(draft, stored, "hex");
		expect(draft.text).toBe("5");
		draft = changeSimulationValueDraftMode(draft, stored, "utf-8");
		draft = changeSimulationValueDraftMode(draft, stored, "binary");

		expect(draft).toEqual({ text: "101", value: testBits(0b101, 3) });
	});

	it("keeps a value that is not valid UTF-8 across view mode changes", () => {
		const value = testBits(0xff, 8);
		let draft = formatSimulationValueDraft(value, "hex");

		draft = changeSimulationValueDraftMode(draft, value, "utf-8");
		draft = changeSimulationValueDraftMode(draft, value, "hex");

		expect(draft).toEqual({ text: "ff", value });
	});

	it("fits parsed text to the bit width, or has no value if it is too wide", () => {
		expect(parseSimulationValueDraft("1", "binary", 4).value).toEqual(
			testBits(1, 4),
		);
		expect(parseSimulationValueDraft("11111", "binary", 4).value).toBeNull();
	});

	it("falls back to the stored value when the text is invalid", () => {
		const stored = testBits(0xff, 8);
		const draft = parseSimulationValueDraft("xyz", "hex");
		expect(draft.value).toBeNull();

		expect(changeSimulationValueDraftMode(draft, stored, "hex")).toEqual({
			text: "ff",
			value: stored,
		});
	});
});
