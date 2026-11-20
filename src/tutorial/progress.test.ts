import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubLocalStorage } from "../store/testUtils";
import {
	forgetClearedStages,
	markStageCleared,
	nextStageOf,
	readClearedStages,
} from "./progress";
import { tutorialStageIds } from "./stages";

let saved: Map<string, string>;
beforeEach(() => {
	saved = stubLocalStorage();
});
afterEach(() => {
	vi.unstubAllGlobals();
});

describe("tutorial progress", () => {
	it("remembers the cleared stages until it is told to forget them", () => {
		markStageCleared("and");
		markStageCleared("xor");
		markStageCleared("and");
		expect([...readClearedStages()]).toEqual(["and", "xor"]);

		forgetClearedStages();
		expect(readClearedStages().size).toBe(0);
	});

	it("ignores what it does not recognize", () => {
		saved.set("ccTutorialProgress", JSON.stringify(["and", "gone", 3]));
		expect([...readClearedStages()]).toEqual(["and"]);

		saved.set("ccTutorialProgress", "broken");
		vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(readClearedStages().size).toBe(0);
	});
});

describe("nextStageOf", () => {
	it("is the first stage not cleared, even before one cleared out of order", () => {
		expect(nextStageOf(new Set())).toBe("and");
		expect(nextStageOf(new Set(["and", "a-only"]))).toBe("xor");
		expect(nextStageOf(new Set(["and", "full-adder"]))).toBe("a-only");
	});

	it("is none once every stage is cleared", () => {
		expect(nextStageOf(new Set(tutorialStageIds))).toBeUndefined();
	});
});
