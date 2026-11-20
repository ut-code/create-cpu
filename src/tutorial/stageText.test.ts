import { describe, expect, it } from "vitest";
import { messagesByLanguage } from "../i18n/messages";
import { tutorialStageIds } from "./stages";
import { parseStageText, type StageTextSegment } from "./stageText";

describe("parseStageText", () => {
	it("cuts a text where it marks names, values and controls", () => {
		expect(parseStageText("Turn {Start} [ON] and press <check>.")).toEqual([
			{ type: "text", text: "Turn " },
			{ type: "name", name: "Start" },
			{ type: "text", text: " " },
			{ type: "value", value: [true], notation: "onOff" },
			{ type: "text", text: " and press " },
			{ type: "control", control: "check" },
			{ type: "text", text: "." },
		]);
	});

	it("reads a value of 0s and 1s bit by bit", () => {
		expect(parseStageText("[0011]")).toEqual([
			{
				type: "value",
				value: [false, false, true, true],
				notation: "digits",
			},
		]);
	});

	it.each(["<unknown>", "[2]", "{Start", "Start}"])(
		"refuses a mark it does not know: %s",
		(text) => {
			expect(() => parseStageText(text)).toThrow();
		},
	);
});

/** What a stage text marks other than names, which a language may translate */
function marksOf(text: string) {
	return parseStageText(text)
		.flatMap((segment: StageTextSegment) => {
			if (segment.type === "value") {
				return [segment.value.map((bit) => (bit ? 1 : 0)).join("")];
			}
			if (segment.type === "control") return [`<${segment.control}>`];
			return [];
		})
		.toSorted();
}

describe("the stage texts", () => {
	const { en, ja } = messagesByLanguage;

	it.each(tutorialStageIds)(
		"of %s mark the same values and controls in every language",
		(id) => {
			const english = en.tutorial.stageTexts[id];
			const japanese = ja.tutorial.stageTexts[id];
			const textsOf = (texts: typeof english) => [
				...texts.goal,
				...texts.steps,
			];
			const japaneseTexts = textsOf(japanese);
			expect(japanese.goal).toHaveLength(english.goal.length);
			expect(japaneseTexts).toHaveLength(textsOf(english).length);
			for (const [index, text] of textsOf(english).entries()) {
				expect(marksOf(japaneseTexts[index] ?? "")).toEqual(marksOf(text));
			}
		},
	);
});
