import { describe, expect, it } from "vitest";
import { MAX_TIME_STEP_NUMBER, parseTimeStepNumber } from "./types";

describe("parseTimeStepNumber", () => {
	it("reads a step typed in half-width or full-width digits", () => {
		expect(parseTimeStepNumber("3600")).toBe(3600);
		expect(parseTimeStepNumber("３６００")).toBe(3600);
		expect(parseTimeStepNumber(" 12 ")).toBe(12);
	});

	it("refuses what is no step", () => {
		expect(parseTimeStepNumber("")).toBeNull();
		expect(parseTimeStepNumber("0")).toBeNull();
		expect(parseTimeStepNumber("-3")).toBeNull();
		expect(parseTimeStepNumber("1.5")).toBeNull();
		expect(parseTimeStepNumber("abc")).toBeNull();
	});

	it("stops a jump at the furthest step that can be gone to", () => {
		expect(parseTimeStepNumber("153600")).toBe(MAX_TIME_STEP_NUMBER);
	});
});
