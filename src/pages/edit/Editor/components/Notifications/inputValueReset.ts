import type { InputValueResetNotice } from "../../store/slices/core/types";

export function describeInputValueReset(notice: InputValueResetNotice): string {
	const inputs = notice.inputs
		.map(({ name, bitWidth }) => `${name} (${bitWidth} bit)`)
		.join(", ");
	return `Input values that no longer fit their bit width were reset to 0: ${inputs}`;
}
