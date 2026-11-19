import { chunk } from "es-toolkit";
import invariant from "tiny-invariant";
import { bitsOf, numberOf } from "../../../../../common/bits";
import type { Messages } from "../../../../../i18n/messages";
import type { CCIntrinsicComponentConstSpecConfigViewMode as Mode } from "../../../../../store/intrinsics/types";
import type { SimulationValue } from "../../../../../store/simulation";

const bitsPerHexDigit = 4;
const bitsPerByte = 8;

/** Pads the head with zeros so that the length becomes a multiple of `unit`. */
function padBits(bits: SimulationValue, unit: number): boolean[] {
	const padding = (unit - (bits.length % unit)) % unit;
	return [...Array<boolean>(padding).fill(false), ...bits];
}

export function formatSimulationValue(
	data: SimulationValue,
	mode: Mode,
): string {
	switch (mode) {
		case "binary":
			return data.map((bit) => (bit ? "1" : "0")).join("");
		case "hex":
			return chunk(padBits(data, bitsPerHexDigit), bitsPerHexDigit)
				.map((digit) => numberOf(digit).toString(16))
				.join("");
		case "utf-8": {
			const bytes = Uint8Array.from(
				chunk(padBits(data, bitsPerByte), bitsPerByte),
				numberOf,
			);
			return new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
		}
	}
}

/** Returns null if `text` is not a valid representation in `mode`. */
export function parseSimulationValue(
	text: string,
	mode: Mode,
): SimulationValue | null {
	switch (mode) {
		case "binary": {
			const digits = text.replace(/\s/g, "");
			if (!/^[01]+$/.test(digits)) return null;
			return [...digits].map((digit) => digit === "1");
		}
		case "hex": {
			const digits = text.replace(/\s/g, "").replace(/^0x/i, "");
			if (!/^[0-9a-f]+$/i.test(digits)) return null;
			return [...digits].flatMap((digit) =>
				bitsOf(Number.parseInt(digit, 16), bitsPerHexDigit),
			);
		}
		case "utf-8": {
			const bytes = new TextEncoder().encode(text);
			if (bytes.length === 0) return null;
			return [...bytes].flatMap((byte) => bitsOf(byte, bitsPerByte));
		}
	}
}

export function fitSimulationValue(
	value: SimulationValue,
	bitWidth: number,
): SimulationValue | null {
	const overflow = value.length - bitWidth;
	if (overflow <= 0) {
		return [...Array<boolean>(-overflow).fill(false), ...value];
	}
	if (value.slice(0, overflow).some((bit) => bit)) return null;
	return value.slice(overflow);
}

export type SimulationValueDraftError =
	| { type: "empty" }
	| { type: "invalid"; mode: Exclude<Mode, "utf-8"> }
	| { type: "tooWide"; requiredBitWidth: number; bitWidth: number };

export type SimulationValueDraft =
	| { text: string; value: SimulationValue; error: null }
	| { text: string; value: null; error: SimulationValueDraftError };

export function formatSimulationValueDraft(
	value: SimulationValue,
	mode: Mode,
): SimulationValueDraft {
	return { text: formatSimulationValue(value, mode), value, error: null };
}

export function parseSimulationValueDraft(
	text: string,
	mode: Mode,
	bitWidth?: number,
): SimulationValueDraft {
	const value = parseSimulationValue(text, mode);
	if (!value) {
		if (text.replace(/\s/g, "") === "")
			return { text, value: null, error: { type: "empty" } };
		invariant(mode !== "utf-8", "Any text but an empty one is valid UTF-8");
		return { text, value: null, error: { type: "invalid", mode } };
	}
	if (bitWidth === undefined) return { text, value, error: null };
	const fitted = fitSimulationValue(value, bitWidth);
	if (fitted) return { text, value: fitted, error: null };
	return {
		text,
		value: null,
		error: {
			type: "tooWide",
			requiredBitWidth: value.length - value.indexOf(true),
			bitWidth,
		},
	};
}

export function describeSimulationValueDraftError(
	error: SimulationValueDraftError,
	messages: Messages,
): string {
	const texts = messages.editor.valueEditor;
	switch (error.type) {
		case "empty":
			return texts.empty;
		case "invalid":
			return texts.invalid(error.mode);
		case "tooWide":
			return texts.tooWide(error.requiredBitWidth, error.bitWidth);
	}
}

export function changeSimulationValueDraftMode(
	draft: SimulationValueDraft,
	fallback: SimulationValue,
	mode: Mode,
): SimulationValueDraft {
	return formatSimulationValueDraft(draft.value ?? fallback, mode);
}
