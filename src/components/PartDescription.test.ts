import { describe, expect, it } from "vitest";
import { parseMarkedText } from "../common/markedText";
import { marksOf } from "../common/markedTextTestUtils";
import { languages, messagesByLanguage } from "../i18n/messages";
import {
	and,
	broadcast,
	decompose,
	definitions,
	display,
} from "../store/intrinsics/definitions";
import { ccIntrinsicComponentTypes } from "../store/intrinsics/types";
import { pinNotesOf } from "./PartDescription";

const { en, ja } = messagesByLanguage;
const allDefinitions = Object.values(definitions);

function textsOf(language: (typeof languages)[number]) {
	const messages = messagesByLanguage[language];
	return [
		...Object.values(ccIntrinsicComponentTypes).map(
			(type) => messages.parts.summaries[type],
		),
		...allDefinitions.flatMap((definition) => pinNotesOf(messages, definition)),
	];
}

describe("pinNotesOf", () => {
	it("tells how to set a pin whose bit width the player chooses", () => {
		expect(pinNotesOf(en, broadcast)).toEqual([
			"The number in the {Out} pin is its number of bits. To change it, click the pin while editing, change the number in the field and press <pinApply>.",
		]);
	});

	it("tells how to add and remove pins where a pin can be split", () => {
		expect(pinNotesOf(ja, decompose)).toEqual([
			"{Out} のピンの中の数字は、そのピンのビット数。編集中にピンをクリックすると、{Out} のピンごとの欄が上から順に並ぶ。<pinAdd>でいちばん下に欄を足し、<pinRemove>でいちばん下の欄を消せる。欄の数字を書きかえて<pinApply>を押すと、{Out} のピンが欄のとおりになる。",
		]);
	});

	it("says nothing of pins whose bit widths follow from elsewhere", () => {
		expect(pinNotesOf(en, and)).toEqual([]);
		expect(pinNotesOf(en, display)).toEqual([]);
	});
});

describe("the part descriptions", () => {
	it("mark the same values and controls in every language", () => {
		const japanese = textsOf("ja");
		for (const [index, english] of textsOf("en").entries()) {
			expect(marksOf(japanese[index] ?? "")).toEqual(marksOf(english));
		}
	});

	it.each(languages)("name only parts and pins in %s", (language) => {
		const known = new Set(
			allDefinitions.flatMap((definition) => [
				definition.name,
				...definition.allPins.map((pin) => pin.name),
			]),
		);
		const names = textsOf(language).flatMap((text) =>
			parseMarkedText(text).flatMap((segment) =>
				segment.type === "name" ? [segment.name] : [],
			),
		);
		expect(names.filter((name) => !known.has(name))).toEqual([]);
	});
});
