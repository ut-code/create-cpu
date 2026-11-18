import { chunk } from "es-toolkit";
import type { CCIntrinsicComponentConstSpecConfigViewMode as Mode } from "../../../../../store/intrinsics/types";
import type { SimulationValue } from "../../../../../store/simulation";

const bitsPerHexDigit = 4;
const bitsPerByte = 8;

/** Bits are ordered from the most significant one, as in `SimulationValue`. */
function toBits(value: number, bitCount: number): boolean[] {
	return Array.from(
		{ length: bitCount },
		(_, i) => ((value >> (bitCount - 1 - i)) & 1) === 1,
	);
}

function fromBits(bits: boolean[]): number {
	return bits.reduce((value, bit) => value * 2 + (bit ? 1 : 0), 0);
}

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
				.map((digit) => fromBits(digit).toString(16))
				.join("");
		case "utf-8": {
			const bytes = Uint8Array.from(
				chunk(padBits(data, bitsPerByte), bitsPerByte),
				fromBits,
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
				toBits(Number.parseInt(digit, 16), bitsPerHexDigit),
			);
		}
		case "utf-8": {
			const bytes = new TextEncoder().encode(text);
			if (bytes.length === 0) return null;
			return [...bytes].flatMap((byte) => toBits(byte, bitsPerByte));
		}
	}
}

const modeNames: Record<Mode, string> = {
	binary: "binary",
	hex: "hex",
	"utf-8": "UTF-8",
};

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
	| { type: "invalid" }
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
	if (!value) return { text, value: null, error: { type: "invalid" } };
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
	mode: Mode,
): string {
	switch (error.type) {
		case "invalid":
			return mode === "utf-8"
				? "Enter some text"
				: `Not a valid ${modeNames[mode]} value`;
		case "tooWide":
			return `Needs ${error.requiredBitWidth} bits, but the width is ${error.bitWidth}`;
	}
}

export function changeSimulationValueDraftMode(
	draft: SimulationValueDraft,
	fallback: SimulationValue,
	mode: Mode,
): SimulationValueDraft {
	return formatSimulationValueDraft(draft.value ?? fallback, mode);
}
