import { describe, expect, it } from "vitest";
import { parseMarkedText } from "../common/markedText";
import { marksOf } from "../common/markedTextTestUtils";
import { type Language, languages, messagesByLanguage } from "../i18n/messages";
import {
	and,
	broadcast,
	decompose,
	definitions,
	display,
} from "../store/intrinsics/definitions";
import { pinNotesOf } from "./PartDescription";

const allDefinitions = Object.values(definitions);

/** Each text describing a part, with the part it describes */
function textsOf(language: Language) {
	const messages = messagesByLanguage[language];
	return allDefinitions.flatMap((definition) =>
		[
			messages.parts.summaries[definition.type],
			...pinNotesOf(messages, definition),
		].map((text) => ({ definition, text })),
	);
}

describe("pinNotesOf", () => {
	it.each(languages)(
		"tells in %s to press Apply after setting a pin's bit width",
		(language) => {
			expect(
				pinNotesOf(messagesByLanguage[language], broadcast).map(marksOf),
			).toEqual([["<pinApply>"]]);
		},
	);

	it.each(languages)(
		"tells in %s how to add and remove pins where a pin can be split",
		(language) => {
			expect(
				pinNotesOf(messagesByLanguage[language], decompose).map(marksOf),
			).toEqual([["<pinAdd>", "<pinApply>", "<pinRemove>"]]);
		},
	);

	it("says nothing of pins whose bit widths follow from elsewhere", () => {
		const { en } = messagesByLanguage;
		expect(pinNotesOf(en, and)).toEqual([]);
		expect(pinNotesOf(en, display)).toEqual([]);
	});
});

describe("the part descriptions", () => {
	it("mark the same values and controls in every language", () => {
		const english = textsOf("en");
		const japanese = textsOf("ja");
		expect(japanese).toHaveLength(english.length);
		for (const [index, { text }] of english.entries()) {
			expect(marksOf(japanese[index]?.text ?? "")).toEqual(marksOf(text));
		}
	});

	it.each(languages)("name only the part and its pins in %s", (language) => {
		const strangers = textsOf(language).flatMap(({ definition, text }) => {
			const known = new Set([
				definition.name,
				...definition.allPins.map((pin) => pin.name),
			]);
			return parseMarkedText(text).flatMap((segment) =>
				segment.type === "name" && !known.has(segment.name)
					? [`${definition.name}: ${segment.name}`]
					: [],
			);
		});
		expect(strangers).toEqual([]);
	});
});
