import { describe, expect, it } from "vitest";
import { parseMarkedText } from "./markedText";

describe("parseMarkedText", () => {
	it("cuts a text where it marks names, values and controls", () => {
		expect(parseMarkedText("Turn {Start} [ON] and press <check>.")).toEqual([
			{ type: "text", text: "Turn " },
			{ type: "name", name: "Start" },
			{ type: "text", text: " " },
			{ type: "value", value: [true], notation: "onOff" },
			{ type: "text", text: " and press " },
			{ type: "control", control: "check" },
			{ type: "text", text: "." },
		]);
	});

	it("reads a value of 0s and 1s bit by bit", () => {
		expect(parseMarkedText("[0011]")).toEqual([
			{
				type: "value",
				value: [false, false, true, true],
				notation: "digits",
			},
		]);
	});

	it.each(["<unknown>", "[2]", "{Start", "Start}"])(
		"refuses a mark it does not know: %s",
		(text) => {
			expect(() => parseMarkedText(text)).toThrow();
		},
	);
});
