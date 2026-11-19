import type { SimulationValue } from "../store/simulation";

/** `value` in `width` bits, the most significant first, as in `SimulationValue` */
export function bitsOf(value: number, width: number): SimulationValue {
	return Array.from(
		{ length: width },
		(_, i) => ((value >> (width - 1 - i)) & 1) === 1,
	);
}

export function numberOf(bits: SimulationValue): number {
	return bits.reduce((value, bit) => value * 2 + (bit ? 1 : 0), 0);
}
