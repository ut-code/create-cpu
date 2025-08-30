import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { CCComponentId } from "../component";
import type { CCComponentPinId } from "../componentPin";
import { IntrinsicComponentDefinition } from "./base";
import {
	type CCIntrinsicComponentType,
	ccIntrinsicComponentTypes,
} from "./types";

// function createNullaryOperator(
// 	type: CCIntrinsicComponentType,
// 	name: string,
// 	evaluate: () => boolean
// ) {
// 	return new IntrinsicComponentDefinition({
// 		type,
// 		name,
// 		in: {},
// 		out: { name: "Out" },
// 		evaluate: (_, output) => {
// 			invariant(output[0]);
// 			return [new Array(output[0].bitWidth).fill(evaluate())];
// 		},
// 	});
// }

function createUnaryOperator(
	type: CCIntrinsicComponentType,
	name: string,
	evaluate: (a: boolean) => boolean,
) {
	return new IntrinsicComponentDefinition({
		type,
		name,
		in: {
			A: { name: "In" },
		},
		out: { name: "Out" },
		evaluate: (input) => {
			invariant(input.A[0] && !input.A[1]);
			const A = input.A[0];
			return [A.map((a) => evaluate(nullthrows(a)))];
		},
	});
}

function createBinaryOperator(
	type: CCIntrinsicComponentType,
	name: string,
	evaluate: (a: boolean, b: boolean) => boolean,
) {
	return new IntrinsicComponentDefinition({
		type,
		name,
		in: {
			A: { name: "A" },
			B: { name: "B" },
		},
		out: { name: "Out" },
		evaluate: (input) => {
			invariant(input.A[0] && !input.A[1]);
			invariant(input.B[0] && !input.B[1]);
			const A = input.A[0];
			const B = input.B[0];
			invariant(A.length === B.length);
			return [
				Array.from({ length: A.length }, (_, i) =>
					evaluate(nullthrows(A[i]), nullthrows(B[i])),
				),
			];
		},
	});
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
export const input = createUnaryOperator(
	ccIntrinsicComponentTypes.INPUT,
	"Input",
	(a) => a,
);

export const aggregate = new IntrinsicComponentDefinition({
	type: ccIntrinsicComponentTypes.AGGREGATE,
	name: "Aggregate",
	in: {
		In: { name: "In", isBitWidthConfigurable: true, isSplittable: true },
	},
	out: { name: "Out" },
	evaluate: (input) => {
		return [input.In.flat()];
	},
});

export const decompose = new IntrinsicComponentDefinition({
	type: ccIntrinsicComponentTypes.DECOMPOSE,
	name: "Decompose",
	in: {
		In: { name: "In" },
	},
	out: { name: "Out", isBitWidthConfigurable: true, isSplittable: true },
	evaluate: (input, outputShape) => {
		invariant(input.In[0] && !input.In[1]);
		const inputValue = input.In[0];
		const outputValue = [];
		let currentIndex = 0;
		for (const shape of outputShape) {
			outputValue.push([
				...inputValue.slice(currentIndex, currentIndex + shape.bitWidth),
			]);
			currentIndex += shape.bitWidth;
		}
		return outputValue;
	},
});

export const broadcast = new IntrinsicComponentDefinition({
	type: ccIntrinsicComponentTypes.BROADCAST,
	name: "Broadcast",
	in: {
		In: { name: "In" },
	},
	out: { name: "Out", isBitWidthConfigurable: true },
	evaluate: (input, outputShape) => {
		invariant(input.In[0] && !input.In[1]);
		invariant(input.In[0][0] !== undefined && !input.In[0][1]);
		const inputValue = input.In[0][0];
		invariant(outputShape[0] && !outputShape[1]);
		const outputBitWidth = outputShape[0].bitWidth;
		return [Array.from({ length: outputBitWidth }, () => inputValue)];
	},
});

export const flipflop = new IntrinsicComponentDefinition({
	type: ccIntrinsicComponentTypes.FLIPFLOP,
	name: "FlipFlop",
	in: {
		In: { name: "In" },
	},
	out: { name: "Out" },
	evaluate: (_0, _1, previousInput) => previousInput.In,
});

export const definitions = {
	[ccIntrinsicComponentTypes.AND]: and,
	[ccIntrinsicComponentTypes.OR]: or,
	[ccIntrinsicComponentTypes.NOT]: not,
	[ccIntrinsicComponentTypes.XOR]: xor,
	[ccIntrinsicComponentTypes.INPUT]: input,
	[ccIntrinsicComponentTypes.AGGREGATE]: aggregate,
	[ccIntrinsicComponentTypes.DECOMPOSE]: decompose,
	[ccIntrinsicComponentTypes.BROADCAST]: broadcast,
	[ccIntrinsicComponentTypes.FLIPFLOP]: flipflop,
} satisfies Record<CCIntrinsicComponentType, IntrinsicComponentDefinition>;

export const definitionByComponentId = new Map<
	CCComponentId,
	IntrinsicComponentDefinition
>(Object.values(definitions).map((definition) => [definition.id, definition]));

export const definitionByComponentPinId = new Map<
	CCComponentPinId,
	IntrinsicComponentDefinition
>(
	Object.values(definitions).flatMap((definition) =>
		definition.allPins.map((pin) => [pin.id, definition]),
	),
);
