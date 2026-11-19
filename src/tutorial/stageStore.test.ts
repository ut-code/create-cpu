import nullthrows from "nullthrows";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CCStoreAutoSaver } from "../store/autoSaver";
import {
	createTestStore,
	registerTestComponent,
	stubLocalStorage,
} from "../store/testUtils";
import { markStageCleared, readClearedStages } from "./progress";
import {
	getTutorialStageStore,
	resetTutorial,
	resetTutorialStage,
} from "./stageStore";
import {
	findTutorialStage,
	setUpTutorialStage,
	type TutorialStageId,
	tutorialStages,
} from "./stages";

const [firstStage, secondStage] = tutorialStages;
if (!firstStage || !secondStage) throw new Error("No stages");
const xorStage = nullthrows(findTutorialStage("xor"));
const aOnlyStage = nullthrows(findTutorialStage("a-only"));
const firstKey = `ccTutorialStage:${firstStage.id}`;
const titleOf = (id: TutorialStageId) => `Stage ${id}`;

let saved: Map<string, string>;
beforeEach(() => {
	saved = stubLocalStorage();
	resetTutorial();
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("getTutorialStageStore", () => {
	it("saves apart from the free mode", () => {
		saved.set(CCStoreAutoSaver.localStorageKey, "free mode");
		const store = getTutorialStageStore(firstStage, titleOf);

		registerTestComponent(store, "Mine");
		vi.advanceTimersByTime(2000);

		expect(saved.get(CCStoreAutoSaver.localStorageKey)).toBe("free mode");
		expect(saved.get(firstKey)).toBe(store.toJSON());
	});

	it("lays out the stage, and saves it only once it changes", () => {
		const store = getTutorialStageStore(firstStage, titleOf);

		expect(store.components.get(firstStage.componentId)).toBeDefined();
		expect(
			store.componentPins
				.getManyByComponentId(firstStage.componentId)
				.map((pin) => pin.name),
		).toEqual(["A", "B", "Out"]);
		expect(saved.size).toBe(0);

		registerTestComponent(store, "Mine");
		vi.advanceTimersByTime(2000);
		expect(saved.get(firstKey)).toBe(store.toJSON());
	});

	it("gives the same store while the page is open", () => {
		expect(getTutorialStageStore(firstStage, titleOf)).toBe(
			getTutorialStageStore(firstStage, titleOf),
		);
	});

	it("brings back a stage saved earlier", () => {
		const earlier = getTutorialStageStore(firstStage, titleOf);
		registerTestComponent(earlier, "Mine");
		vi.advanceTimersByTime(2000);
		const json = earlier.toJSON();
		// As on a reload, where the stores of the earlier visit are gone
		earlier.autoSaver.unwatch();
		vi.resetModules();

		return import("./stageStore").then(({ getTutorialStageStore: fresh }) => {
			expect(fresh(firstStage, titleOf).toJSON()).toBe(json);
		});
	});

	it("brings back a stage with the parts it hands over as saved", async () => {
		const earlier = getTutorialStageStore(xorStage, titleOf);
		registerTestComponent(earlier, "Mine");
		vi.advanceTimersByTime(2000);
		const json = earlier.toJSON();
		earlier.autoSaver.unwatch();
		vi.resetModules();

		const { getTutorialStageStore: fresh } = await import("./stageStore");
		expect(fresh(xorStage, titleOf).toJSON()).toBe(json);
	});

	it("adds a part handed over to a save made before, keeping the player's circuit", async () => {
		const earlier = createTestStore();
		setUpTutorialStage(earlier, xorStage, titleOf);
		await earlier.components.unregister(aOnlyStage.componentId);
		const mine = registerTestComponent(earlier, "Mine");
		saved.set(`ccTutorialStage:${xorStage.id}`, earlier.toJSON());

		const store = getTutorialStageStore(xorStage, titleOf);

		expect(store.components.get(aOnlyStage.componentId)).toBeDefined();
		expect(store.components.get(mine.id)).toBeDefined();
	});

	it("starts a stage over when what was saved is broken", () => {
		saved.set(firstKey, "broken");
		vi.spyOn(console, "warn").mockImplementation(() => {});

		const store = getTutorialStageStore(firstStage, titleOf);

		expect(store.components.get(firstStage.componentId)).toBeDefined();
	});
});

describe("resetTutorialStage", () => {
	it("lays the stage out anew and stops the old store from saving", () => {
		const old = getTutorialStageStore(firstStage, titleOf);
		registerTestComponent(old, "Mine");

		const store = resetTutorialStage(firstStage, titleOf);
		vi.advanceTimersByTime(2000);

		expect(store).not.toBe(old);
		expect(store.components.getMany().some((c) => c.name === "Mine")).toBe(
			false,
		);
		expect(saved.has(firstKey)).toBe(false);
	});
});

describe("resetTutorial", () => {
	it("forgets every stage and what was cleared", () => {
		const store = getTutorialStageStore(secondStage, titleOf);
		registerTestComponent(store, "Mine");
		vi.advanceTimersByTime(2000);
		markStageCleared(firstStage.id);

		resetTutorial();

		expect(saved.size).toBe(0);
		expect(readClearedStages().size).toBe(0);
		expect(getTutorialStageStore(secondStage, titleOf)).not.toBe(store);
	});
});
