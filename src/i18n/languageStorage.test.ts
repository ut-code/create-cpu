import { afterEach, describe, expect, it, vi } from "vitest";
import { readSavedLanguage, saveLanguage } from "./languageStorage";

describe("language storage", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("saves and reads back the chosen language", () => {
		const saved = new Map<string, string>();
		const storage = () =>
			({
				getItem: (key: string) => saved.get(key) ?? null,
				setItem: (key: string, value: string) => saved.set(key, value),
			}) as unknown as Storage;

		saveLanguage(storage, "ja");

		expect(readSavedLanguage(storage)).toBe("ja");
	});

	it("goes on when the storage cannot be reached", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const blocked = (): Storage => {
			throw new DOMException("blocked", "SecurityError");
		};

		expect(readSavedLanguage(blocked)).toBeNull();
		expect(() => saveLanguage(blocked, "ja")).not.toThrow();
	});
});
