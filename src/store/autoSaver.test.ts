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

	it("does not save a change made without saving", () => {
		const store = createTestStore();
		store.autoSaver.watch();

		store.autoSaver.changeWithoutSaving(() =>
			registerTestComponent(store, "Adder"),
		);
		vi.advanceTimersByTime(2000);

		expect(saved.size).toBe(0);
	});

	it("keeps a save still waiting through a change made without saving", () => {
		const store = createTestStore();
		store.autoSaver.watch();

		registerTestComponent(store, "Adder");
		store.autoSaver.changeWithoutSaving(() =>
			registerTestComponent(store, "Multiplier"),
		);
		vi.advanceTimersByTime(2000);

		expect(saved.get(CCStoreAutoSaver.localStorageKey)).toBe(store.toJSON());
	});

	it("saves changes again after a change made without saving fails", () => {
		const store = createTestStore();
		store.autoSaver.watch();

		expect(() =>
			store.autoSaver.changeWithoutSaving(() => {
				throw new Error("Failed");
			}),
		).toThrow("Failed");
		registerTestComponent(store, "Adder");
		vi.advanceTimersByTime(2000);

		expect(saved.get(CCStoreAutoSaver.localStorageKey)).toBe(store.toJSON());
	});
});
