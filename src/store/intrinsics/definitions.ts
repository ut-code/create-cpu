import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { CCComponentId } from "../component";
import type { CCComponentPinId } from "../componentPin";
import { IntrinsicComponentDefinition } from "./base";
import {
	type CCIntrinsicComponentBinaryOperatorSpec,
	type CCIntrinsicComponentConstSpec,
	type CCIntrinsicComponentDisplaySpec,
	type CCIntrinsicComponentInputSpec,
	type CCIntrinsicComponentNullaryOperatorSpec,
	type CCIntrinsicComponentOutputSpec,
	type CCIntrinsicComponentSpecByType,
	type CCIntrinsicComponentType,
	type CCIntrinsicComponentUnaryOperatorSpec,
	ccIntrinsicComponentTypes,
} from "./types";

/** The one entry of a pin key that cannot be split into multiple node pins. */
function single<T>(values: readonly T[]): T {
	invariant(values.length === 1, `Expected a single pin, got ${values.length}`);
	return nullthrows(values[0]);
}

function createUnaryOperator(
	type: CCIntrinsicComponentType,
	name: string,
	evaluate: (a: boolean) => boolean,
) {
	return new IntrinsicComponentDefinition<CCIntrinsicComponentUnaryOperatorSpec>(
		{
			type,
			name,
			in: { In: { name: "In", bitWidthPolicy: { type: "inferred" } } },
			out: { Out: { name: "Out", bitWidthPolicy: { type: "inferred" } } },
			initialConfig: null,
			behavior: {
				kind: "combinational",
				evaluate: ({ In }) => ({ Out: [single(In).map((a) => evaluate(a))] }),
			},
		},
	);
}

function createBinaryOperator(
	type: CCIntrinsicComponentType,
	name: string,
	evaluate: (a: boolean, b: boolean) => boolean,
) {
	return new IntrinsicComponentDefinition<CCIntrinsicComponentBinaryOperatorSpec>(
		{
			type,
			name,
			in: {
				A: { name: "A", bitWidthPolicy: { type: "inferred" } },
				B: { name: "B", bitWidthPolicy: { type: "inferred" } },
			},
			out: { Out: { name: "Out", bitWidthPolicy: { type: "inferred" } } },
			initialConfig: null,
			behavior: {
				kind: "combinational",
				evaluate: ({ A, B }) => {
					const a = single(A);
					const b = single(B);
					invariant(
						a.length === b.length,
						`Input lengths must match (A: ${a.length}, B: ${b.length})`,
					);
					return { Out: [a.map((bit, i) => evaluate(bit, nullthrows(b[i])))] };
				},
			},
		},
	);
}

function createNullaryOperator(
	type: CCIntrinsicComponentType,
	name: string,
	value: boolean,
) {
	return new IntrinsicComponentDefinition<CCIntrinsicComponentNullaryOperatorSpec>(
		{
			type,
			name,
			in: {},
			out: { Out: { name: "Out", bitWidthPolicy: { type: "inferred" } } },
			initialConfig: null,
			behavior: {
				kind: "combinational",
				evaluate: (_, { outputBitWidths }) => ({
					Out: [new Array(single(outputBitWidths.Out)).fill(value)],
				}),
			},
		},
	);
}

export const and = createBinaryOperator(
	ccIntrinsicComponentTypes.AND,
	"And",
	(a, b) => a && b,
);
export const or = createBinaryOperator(
	ccIntrinsicComponentTypes.OR,
	"Or",
	(a, b) => a || b,
);
export const not = createUnaryOperator(
	ccIntrinsicComponentTypes.NOT,
	"Not",
	(a) => !a,
);
export const xor = createBinaryOperator(
	ccIntrinsicComponentTypes.XOR,
	"Xor",
	(a, b) => a !== b,
);
export const true_ = createNullaryOperator(
	ccIntrinsicComponentTypes.TRUE,
	"True",
	true,
);
export const false_ = createNullaryOperator(
	ccIntrinsicComponentTypes.FALSE,
	"False",
	false,
);

export const input =
	new IntrinsicComponentDefinition<CCIntrinsicComponentInputSpec>({
		type: ccIntrinsicComponentTypes.INPUT,
		name: "Input",
		in: {},
		out: { Out: { name: "In", bitWidthPolicy: { type: "inferred" } } },
		initialConfig: null,
		behavior: null,
	});

export const output =
	new IntrinsicComponentDefinition<CCIntrinsicComponentOutputSpec>({
		type: ccIntrinsicComponentTypes.OUTPUT,
		name: "Output",
		in: { In: { name: "Out", bitWidthPolicy: { type: "inferred" } } },
		out: {},
		initialConfig: null,
		behavior: null,
	});

export const aggregate =
	new IntrinsicComponentDefinition<CCIntrinsicComponentUnaryOperatorSpec>({
		type: ccIntrinsicComponentTypes.AGGREGATE,
		name: "Aggregate",
		in: {
			In: {
				name: "In",
				bitWidthPolicy: { type: "configurable", isSplittable: true },
			},
		},
		out: {
			Out: {
				name: "Out",
				bitWidthPolicy: {
					type: "calculated",
					calculateBitWidth: (_, manualBitWidths) =>
						manualBitWidths?.In?.reduce((sum, bitWidth) => sum + bitWidth, 0) ??
						1,
				},
			},
		},
		initialConfig: null,
		behavior: {
			kind: "combinational",
			evaluate: ({ In }) => ({ Out: [In.flat()] }),
		},
	});

export const decompose =
	new IntrinsicComponentDefinition<CCIntrinsicComponentUnaryOperatorSpec>({
		type: ccIntrinsicComponentTypes.DECOMPOSE,
		name: "Decompose",
		in: {
			In: {
				name: "In",
				bitWidthPolicy: {
					type: "calculated",
					calculateBitWidth: (_, manualBitWidths) =>
						manualBitWidths?.Out?.reduce(
							(sum, bitWidth) => sum + bitWidth,
							0,
						) ?? 1,
				},
			},
		},
		out: {
			Out: {
				name: "Out",
				bitWidthPolicy: { type: "configurable", isSplittable: true },
			},
		},
		initialConfig: null,
		behavior: {
			kind: "combinational",
			evaluate: ({ In }, { outputBitWidths }) => {
				const value = single(In);
				let offset = 0;
				return {
					Out: outputBitWidths.Out.map((bitWidth) => {
						const part = value.slice(offset, offset + bitWidth);
						offset += bitWidth;
						return part;
					}),
				};
			},
		},
	});

export const and_n =
	new IntrinsicComponentDefinition<CCIntrinsicComponentUnaryOperatorSpec>({
		type: ccIntrinsicComponentTypes.ANDN,
		name: "AndN",
		in: {
			In: {
				name: "In",
				bitWidthPolicy: { type: "configurable", isSplittable: true },
			},
		},
		out: {
			Out: {
				name: "Out",
				bitWidthPolicy: { type: "calculated", calculateBitWidth: () => 1 },
			},
		},
		initialConfig: null,
		behavior: {
			kind: "combinational",
			evaluate: ({ In }) => ({
				Out: [[In.every((value) => value.every(Boolean))]],
			}),
		},
	});

export const or_n =
	new IntrinsicComponentDefinition<CCIntrinsicComponentUnaryOperatorSpec>({
		type: ccIntrinsicComponentTypes.ORN,
		name: "OrN",
		in: {
			In: {
				name: "In",
				bitWidthPolicy: { type: "configurable", isSplittable: true },
			},
		},
		out: {
			Out: {
				name: "Out",
				bitWidthPolicy: { type: "calculated", calculateBitWidth: () => 1 },
			},
		},
		initialConfig: null,
		behavior: {
			kind: "combinational",
			evaluate: ({ In }) => ({
				Out: [[In.some((value) => value.some(Boolean))]],
			}),
		},
	});

export const broadcast =
	new IntrinsicComponentDefinition<CCIntrinsicComponentUnaryOperatorSpec>({
		type: ccIntrinsicComponentTypes.BROADCAST,
		name: "Broadcast",
		in: {
			In: {
				name: "In",
				bitWidthPolicy: { type: "calculated", calculateBitWidth: () => 1 },
			},
		},
		out: {
			Out: {
				name: "Out",
				bitWidthPolicy: { type: "configurable", isSplittable: false },
			},
		},
		initialConfig: null,
		behavior: {
			kind: "combinational",
			evaluate: ({ In }, { outputBitWidths }) => {
				const bit = single(single(In));
				return {
					Out: [new Array(single(outputBitWidths.Out)).fill(bit)],
				};
			},
		},
	});

export const flipflop =
	new IntrinsicComponentDefinition<CCIntrinsicComponentUnaryOperatorSpec>({
		type: ccIntrinsicComponentTypes.FLIPFLOP,
		name: "FlipFlop",
		in: { In: { name: "In", bitWidthPolicy: { type: "inferred" } } },
		out: { Out: { name: "Out", bitWidthPolicy: { type: "inferred" } } },
		initialConfig: null,
		behavior: {
			kind: "sequential",
			// Nothing has been fed to it before the first time step, so it starts from zero
			evaluate: (previousInputs, { outputBitWidths }) => ({
				Out: [
					previousInputs
						? single(previousInputs.In)
						: new Array(single(outputBitWidths.Out)).fill(false),
				],
			}),
		},
	});

export const display =
	new IntrinsicComponentDefinition<CCIntrinsicComponentDisplaySpec>({
		type: ccIntrinsicComponentTypes.DISPLAY,
		name: "Display",
		in: {
			Pixels: {
				name: "Pixels",
				bitWidthPolicy: {
					type: "calculated",
					calculateBitWidth: (config) =>
						config.resolution.x * config.resolution.y,
				},
			},
		},
		out: {},
		initialConfig: { resolution: { x: 20, y: 15 } },
		// The renderer reads the pixels from the input pin; there is nothing to compute
		behavior: { kind: "combinational", evaluate: () => ({}) },
	});

export const const_ =
	new IntrinsicComponentDefinition<CCIntrinsicComponentConstSpec>({
		type: ccIntrinsicComponentTypes.CONST,
		name: "Const",
		in: {},
		out: {
			Out: {
				name: "Out",
				bitWidthPolicy: {
					type: "calculated",
					calculateBitWidth: (config) => config.data.length,
				},
			},
		},
		initialConfig: { mode: "binary", data: new Array(8).fill(false) },
		behavior: {
			kind: "combinational",
			evaluate: (_, { config }) => ({ Out: [config.data] }),
		},
	});

export const definitions: {
	[t in CCIntrinsicComponentType]: IntrinsicComponentDefinition<
		CCIntrinsicComponentSpecByType[t]
	>;
} = {
	[ccIntrinsicComponentTypes.AND]: and,
	[ccIntrinsicComponentTypes.OR]: or,
	[ccIntrinsicComponentTypes.NOT]: not,
	[ccIntrinsicComponentTypes.XOR]: xor,
	[ccIntrinsicComponentTypes.INPUT]: input,
	[ccIntrinsicComponentTypes.OUTPUT]: output,
	[ccIntrinsicComponentTypes.AGGREGATE]: aggregate,
	[ccIntrinsicComponentTypes.DECOMPOSE]: decompose,
	[ccIntrinsicComponentTypes.BROADCAST]: broadcast,
	[ccIntrinsicComponentTypes.FLIPFLOP]: flipflop,
	[ccIntrinsicComponentTypes.DISPLAY]: display,
	[ccIntrinsicComponentTypes.CONST]: const_,
	[ccIntrinsicComponentTypes.TRUE]: true_,
	[ccIntrinsicComponentTypes.FALSE]: false_,
	[ccIntrinsicComponentTypes.ANDN]: and_n,
	[ccIntrinsicComponentTypes.ORN]: or_n,
};

export const definitionByComponentId = new Map<
	CCComponentId,
	IntrinsicComponentDefinition
>(
	Object.values(definitions).map((definition) => [
		definition.id,
		definition as IntrinsicComponentDefinition,
	]),
);

export const definitionByComponentPinId = new Map<
	CCComponentPinId,
	IntrinsicComponentDefinition
>(
	Object.values(definitions).flatMap((definition) =>
		definition.allPins.map((pin) => [
			pin.id,
			definition as IntrinsicComponentDefinition,
		]),
	),
);
