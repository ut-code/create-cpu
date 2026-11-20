import type { BitNotation } from "../common/bitLabel";
import type { SimulationValue } from "../store/simulation";

/** Things on the screen a stage text points at, drawn as they look there */
export const stageTextControls = [
	"check",
	"constApply",
	"pinApply",
	"auto",
	"play",
	"edit",
	"previousStep",
	"nextStep",
	"enter",
] as const;
export type StageTextControl = (typeof stageTextControls)[number];

export type StageTextSegment =
	| { type: "text"; text: string }
	/** a pin or a part, by the name the editor shows */
	| { type: "name"; name: string }
	| { type: "value"; value: SimulationValue; notation: BitNotation }
	| { type: "control"; control: StageTextControl };

function isControl(key: string): key is StageTextControl {
	return stageTextControls.some((control) => control === key);
}

function parseValue(token: string): StageTextSegment {
	if (token === "ON" || token === "OFF") {
		return { type: "value", value: [token === "ON"], notation: "onOff" };
	}
	if (/^[01]+$/.test(token)) {
		return {
			type: "value",
			value: [...token].map((digit) => digit === "1"),
			notation: "digits",
		};
	}
	throw new Error(`[${token}] is not ON, OFF or a value of 0s and 1s`);
}

const markup = /\{([^{}]+)\}|\[([^[\]]+)\]|<([A-Za-z]+)>/g;

/**
 * A stage text cut where it marks a name as `{Start}`, a value as `[ON]` or `[0011]`,
 * or a control as `<check>`
 * @throws if a mark is not one of these, so that a typo shows in the tests
 */
export function parseStageText(text: string): StageTextSegment[] {
	const segments: StageTextSegment[] = [];
	let rest = 0;
	const pushText = (end: number) => {
		const plain = text.slice(rest, end);
		if (/[{}[\]<>]/.test(plain)) {
			throw new Error(`An unfinished mark in "${plain}"`);
		}
		if (plain) segments.push({ type: "text", text: plain });
	};
	for (const match of text.matchAll(markup)) {
		pushText(match.index);
		const [whole, name, value, control] = match;
		if (name !== undefined) segments.push({ type: "name", name });
		else if (value !== undefined) segments.push(parseValue(value));
		else if (control !== undefined && isControl(control)) {
			segments.push({ type: "control", control });
		} else throw new Error(`${whole} is not a control a stage text can show`);
		rest = match.index + whole.length;
	}
	pushText(text.length);
	return segments;
}
