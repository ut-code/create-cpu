import { chunk } from "es-toolkit";
import type { CCIntrinsicComponentConstSpecConfigViewMode as Mode } from "../../../../../../../store/intrinsics/types";
import type { SimulationValue } from "../../../../../../../store/simulation";

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

export function formatConstData(data: SimulationValue, mode: Mode): string {
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
			return new TextDecoder().decode(bytes);
		}
	}
}

/** Returns null if `text` is not a valid representation in `mode`. */
export function parseConstData(
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
