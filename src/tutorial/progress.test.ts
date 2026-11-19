import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubLocalStorage } from "../store/testUtils";
import {
	forgetClearedStages,
	markStageCleared,
	readClearedStages,
} from "./progress";

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
