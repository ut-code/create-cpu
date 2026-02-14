import type { JsonValue } from "type-fest";
import type { Vector2 } from "../../common/vector2";

export const ccIntrinsicComponentTypes = {
	AND: "AND",
	OR: "OR",
	NOT: "NOT",
	XOR: "XOR",
	INPUT: "INPUT",
	OUTPUT: "OUTPUT",
	AGGREGATE: "AGGREGATE",
	BROADCAST: "BROADCAST",
	DECOMPOSE: "DECOMPOSE",
	FLIPFLOP: "FLIPFLOP",
	DISPLAY: "DISPLAY",
} as const;
export type CCIntrinsicComponentType = keyof typeof ccIntrinsicComponentTypes;

export type CCIntrinsicComponentSpec = {
	in: string;
	out: string;
	config: JsonValue;
};

export type CCIntrinsicComponentInputSpec = {
	in: never;
	out: "Out";
	config: null;
};

export type CCIntrinsicComponentOutputSpec = {
	in: "In";
	out: never;
	config: null;
};

export type CCIntrinsicComponentUnaryOperatorSpec = {
	in: "In";
	out: "Out";
	config: null;
};

export type CCIntrinsicComponentBinaryOperatorSpec = {
	in: "A" | "B";
	out: "Out";
	config: null;
};

export type CCIntrinsicComponentDisplaySpec = {
	in: "Pixels";
	out: never;
	config: { resolution: Vector2 };
};

export type CCIntrinsicComponentSpecByType = {
	[ccIntrinsicComponentTypes.AND]: CCIntrinsicComponentBinaryOperatorSpec;
	[ccIntrinsicComponentTypes.OR]: CCIntrinsicComponentBinaryOperatorSpec;
	[ccIntrinsicComponentTypes.NOT]: CCIntrinsicComponentUnaryOperatorSpec;
	[ccIntrinsicComponentTypes.XOR]: CCIntrinsicComponentBinaryOperatorSpec;
	[ccIntrinsicComponentTypes.INPUT]: CCIntrinsicComponentInputSpec;
	[ccIntrinsicComponentTypes.OUTPUT]: CCIntrinsicComponentOutputSpec;
	[ccIntrinsicComponentTypes.AGGREGATE]: CCIntrinsicComponentUnaryOperatorSpec;
	[ccIntrinsicComponentTypes.DECOMPOSE]: CCIntrinsicComponentUnaryOperatorSpec;
	[ccIntrinsicComponentTypes.BROADCAST]: CCIntrinsicComponentUnaryOperatorSpec;
	[ccIntrinsicComponentTypes.FLIPFLOP]: CCIntrinsicComponentUnaryOperatorSpec;
	[ccIntrinsicComponentTypes.DISPLAY]: CCIntrinsicComponentDisplaySpec;
};
