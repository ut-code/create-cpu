import type { SimulationValue } from "../store/simulation";

/** How a table writes a bit: digits once binary has been taught */
export type BitNotation = "onOff" | "digits";

export function bitLabel(bit: boolean): string {
	return bit ? "ON" : "OFF";
}

export function bitDigit(bit: boolean): string {
	return bit ? "1" : "0";
}

export function valueLabel(value: SimulationValue): string {
	const [bit] = value;
	if (value.length === 1 && bit !== undefined) return bitLabel(bit);
	return value.map(bitDigit).join("");
}
