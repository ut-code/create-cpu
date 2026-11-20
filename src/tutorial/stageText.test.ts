import { describe, expect, it } from "vitest";
import { type MarkedTextSegment, parseMarkedText } from "../common/markedText";
import { languages, messagesByLanguage } from "../i18n/messages";
import { definitions } from "../store/intrinsics/definitions";
import {
	isTutorialStageId,
	tutorialPartIds,
	tutorialParts,
	tutorialStageIds,
	tutorialStages,
} from "./stages";

/** What a stage text marks other than names, which a language may translate */
function marksOf(text: string) {
	return parseMarkedText(text)
		.flatMap((segment: MarkedTextSegment) => {
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

describe("the names in stage texts", () => {
	// A part handed over is named by its title, so a renamed title must be renamed in the
	// texts too
	it.each(languages)("are pins, parts or titles in %s", (language) => {
		const texts = messagesByLanguage[language].tutorial;
		const known = new Set([
			...Object.values(definitions).flatMap((definition) => [
				definition.name,
				...definition.allPins.map((pin) => pin.name),
			]),
			...[...tutorialStages, ...tutorialParts].flatMap(({ check }) => [
				...check.inputs.map(({ name }) => name),
				...check.outputs,
			]),
			...[...tutorialStageIds, ...tutorialPartIds].map((id) =>
				isTutorialStageId(id)
					? texts.stageTexts[id].title
					: texts.partTitles[id],
			),
		]);
		const names = tutorialStageIds.flatMap((id) =>
			[...texts.stageTexts[id].goal, ...texts.stageTexts[id].steps].flatMap(
				(text) =>
					parseMarkedText(text).flatMap((segment) =>
						segment.type === "name" ? [segment.name] : [],
					),
			),
		);
		expect(names.filter((name) => !known.has(name))).toEqual([]);
	});
});
