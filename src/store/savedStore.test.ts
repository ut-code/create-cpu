import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CCStoreJsonError } from ".";
import { CCStoreAutoSaver } from "./autoSaver";
import { setupDefaultSample } from "./samples/default";
import {
	createSavedStore,
	importStoreJson,
	type RestoredStore,
	replaceSavedStore,
	restoreSavedStore,
} from "./savedStore";
import {
	connectTestNodePins,
	createTestStore,
	registerTestComponent,
	registerTestInputNode,
	registerTestOutputNode,
	stubLocalStorage,
} from "./testUtils";

let saved: Map<string, string>;
beforeEach(() => {
	saved = stubLocalStorage();
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

function savedJson() {
	return saved.get(CCStoreAutoSaver.localStorageKey);
}

describe("createSavedStore", () => {
	it("saves the sample at once, before any change", () => {
		const store = createSavedStore();

		expect(savedJson()).toBe(store.toJSON());
	});

	it("saves an imported store at once", () => {
		const source = createTestStore();
		registerTestComponent(source, "Adder");

		createSavedStore(source.toJSON());

		expect(savedJson()).toBe(source.toJSON());
	});
});

describe("importStoreJson", () => {
	function exportedStore() {
		const store = createTestStore();
		const component = registerTestComponent(store, "Wire");
		const into = registerTestInputNode(store, component.id, "In");
		const out = registerTestOutputNode(store, component.id, "Out");
		connectTestNodePins(store, component.id, into.out, out.in);
		return { json: JSON.parse(store.toJSON()), into, out, component };
	}

	it("accepts the stores the app makes", () => {
		const sample = createTestStore();
		setupDefaultSample(sample);

		expect(() => importStoreJson(sample.toJSON())).not.toThrow();
		expect(() =>
			importStoreJson(JSON.stringify(exportedStore().json)),
		).not.toThrow();
	});

	it("refuses a store that refers to missing objects", () => {
		const { json } = exportedStore();
		json.connections.push({
			id: "dangling",
			from: "missing",
			to: "missing",
			parentComponentId: "missing",
			bentPortion: 0.5,
		});

		expect(() => importStoreJson(JSON.stringify(json))).toThrow(
			CCStoreJsonError,
		);
	});

	it("refuses an input pin with two connections", () => {
		const { json, into, out, component } = exportedStore();
		json.connections.push({
			id: "second",
			from: into.out,
			to: out.in,
			parentComponentId: component.id,
			bentPortion: 0.5,
		});

		expect(() => importStoreJson(JSON.stringify(json))).toThrow(
			/more than one connection/,
		);
	});

	it("refuses a pin of a component made of nothing", () => {
		const { json } = exportedStore();
		for (const pin of json.componentPins) pin.implementation = null;

		expect(() => importStoreJson(JSON.stringify(json))).toThrow(
			/implementation/,
		);
	});

	it("reports any other failure to import as a bad store", () => {
		const json = {
			components: [null],
			nodes: [],
			componentPins: [],
			nodePins: [],
			connections: [],
		};

		expect(() => importStoreJson(JSON.stringify(json))).toThrow(
			CCStoreJsonError,
		);
	});
});

describe("restoreSavedStore", () => {
	function readyStore(restored: RestoredStore) {
		if (restored.type === "unrestorable") throw restored.error;
		return restored.store;
	}

	it("starts with the sample, saved, on the first visit", () => {
		const store = readyStore(restoreSavedStore());

		expect(store.components.getMany().length).toBeGreaterThan(0);
		expect(savedJson()).toBe(store.toJSON());
	});

	it("brings back the saved store and keeps saving it", () => {
		const source = createTestStore();
		registerTestComponent(source, "Adder");
		saved.set(CCStoreAutoSaver.localStorageKey, source.toJSON());

		const store = readyStore(restoreSavedStore());

		expect(store.toJSON()).toBe(source.toJSON());
		registerTestComponent(store, "Multiplier");
		vi.advanceTimersByTime(2000);
		expect(savedJson()).toBe(store.toJSON());
	});

	it.each([
		["is not a store", "not json"],
		[
			"refers to missing objects",
			JSON.stringify({
				components: [],
				nodes: [],
				componentPins: [],
				nodePins: [],
				connections: [
					{
						id: "dangling",
						from: "missing",
						to: "missing",
						parentComponentId: "missing",
						bentPortion: 0.5,
					},
				],
			}),
		],
	])("leaves a saved store that %s untouched", (_, json) => {
		saved.set(CCStoreAutoSaver.localStorageKey, json);

		const restored = restoreSavedStore();
		vi.advanceTimersByTime(2000);

		expect(restored).toMatchObject({ type: "unrestorable", json });
		expect(savedJson()).toBe(json);
	});
});

describe("replaceSavedStore", () => {
	it("stops the replaced store from saving over the new one", () => {
		const current = createSavedStore();
		registerTestComponent(current, "Pending");

		const replacement = replaceSavedStore(current);
		vi.advanceTimersByTime(2000);

		expect(savedJson()).toBe(replacement.toJSON());
	});

	it("keeps the current store saving when the new one cannot be saved", () => {
		const current = createSavedStore();
		const quotaError = new DOMException("full", "QuotaExceededError");
		stubLocalStorage(() => {
			throw quotaError;
		});

		expect(() => replaceSavedStore(current)).toThrow(quotaError);

		saved = stubLocalStorage();
		registerTestComponent(current, "Kept");
		vi.advanceTimersByTime(2000);
		expect(savedJson()).toBe(current.toJSON());
	});

	it("keeps the current store saving when the import fails", () => {
		const current = createSavedStore();

		expect(() => replaceSavedStore(current, "not json")).toThrow(
			CCStoreJsonError,
		);

		registerTestComponent(current, "Kept");
		vi.advanceTimersByTime(2000);
		expect(savedJson()).toBe(current.toJSON());
	});
});
