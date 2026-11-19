import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CCStoreAutoSaver } from "./autoSaver";
import {
	createTestStore,
	registerTestComponent,
	stubLocalStorage,
} from "./testUtils";

describe("CCStoreAutoSaver", () => {
	let saved: Map<string, string>;
	beforeEach(() => {
		saved = stubLocalStorage();
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("saves a change after a while", () => {
		const store = createTestStore();
		store.autoSaver.watch();

		registerTestComponent(store, "Adder");
		vi.advanceTimersByTime(2000);

		expect(saved.get(CCStoreAutoSaver.localStorageKey)).toBe(store.toJSON());
	});

	it("drops a save still waiting once it stops watching", () => {
		const store = createTestStore();
		store.autoSaver.watch();

		registerTestComponent(store, "Adder");
		store.autoSaver.unwatch();
		registerTestComponent(store, "Multiplier");
		vi.advanceTimersByTime(2000);

		expect(saved.size).toBe(0);
	});
});
