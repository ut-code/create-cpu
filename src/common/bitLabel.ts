import type { SimulationValue } from "../store/simulation";

export function bitLabel(bit: boolean): string {
	return bit ? "ON" : "OFF";
}

export function valueLabel(value: SimulationValue): string {
	const [bit] = value;
	if (value.length === 1 && bit !== undefined) return bitLabel(bit);
	return value.map((b) => (b ? "1" : "0")).join("");
}
