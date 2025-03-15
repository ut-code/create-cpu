export const ccIntrinsicComponentTypes = {
	AND: "AND",
	OR: "OR",
	NOT: "NOT",
	XOR: "XOR",
	INPUT: "INPUT",
	AGGREGATE: "AGGREGATE",
	BROADCAST: "BROADCAST",
	DECOMPOSE: "DECOMPOSE",
	FLIPFLOP: "FLIPFLOP",
} as const;
export type CCIntrinsicComponentType = keyof typeof ccIntrinsicComponentTypes;
