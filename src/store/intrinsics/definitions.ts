import nullthrows from "nullthrows";
import invariant from "tiny-invariant";
import type { CCComponentId } from "../component";
import type { CCComponentPinId } from "../componentPin";
import { IntrinsicComponentDefinition } from "./base";
import {
	type CCIntrinsicComponentBinaryOperatorSpec,
	type CCIntrinsicComponentDisplaySpec,
	type CCIntrinsicComponentSpecByType,
	type CCIntrinsicComponentType,
	ccIntrinsicComponentTypes,
	type CCIntrinsicComponentUnaryOperatorSpec,
} from "./types";

function createUnaryOperator(
	type: CCIntrinsicComponentType,
	name: string,
	evaluate: (a: boolean) => boolean,
) {
	return new IntrinsicComponentDefinition<CCIntrinsicComponentUnaryOperatorSpec>(
		{
			type,
			name,
			in: { In: { name: "In" } },
			out: { Out: { name: "Out" } },
			initialConfig: null,
			evaluate: (context, nodeId, shape) => {
				const inputShape = shape.inputNodePinIds.A;
				invariant(inputShape[0] && !inputShape[1]);
				const nodePinIdToValue = context.currentFrame.nodes.get(nodeId)?.pins;
				invariant(nodePinIdToValue);
				const inputValue = nodePinIdToValue.get(inputShape[0].nodePinId);
				invariant(inputValue);
				return [inputValue.map((a) => evaluate(nullthrows(a)))];
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
			in: { A: { name: "A" }, B: { name: "B" } },
			out: { Out: { name: "Out" } },
			initialConfig: null,
			evaluate: (context, nodeId, shape) => {
				const inputShapeA = shape.inputNodePinIds.A;
				const inputShapeB = shape.inputNodePinIds.B;
				invariant(
					inputShapeA[0] &&
						!inputShapeA[1] &&
						inputShapeB[0] &&
						!inputShapeB[1],
				);
				const nodePinIdToValue = context.currentFrame.nodes.get(nodeId)?.pins;
				invariant(nodePinIdToValue);
				const inputValueA = nodePinIdToValue.get(inputShapeA[0].nodePinId);
				const inputValueB = nodePinIdToValue.get(inputShapeB[0].nodePinId);
				invariant(inputValueA && inputValueB);
				invariant(inputValueA.length === inputValueB.length);
				return [
					Array.from({ length: inputValueA.length }, (_, i) =>
						evaluate(nullthrows(inputValueA[i]), nullthrows(inputValueB[i])),
					),
				];
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
export const input = createUnaryOperator(
	ccIntrinsicComponentTypes.INPUT,
	"Input",
	(a) => a,
);
export const output = createUnaryOperator(
	ccIntrinsicComponentTypes.OUTPUT,
	"Output",
	(a) => a,
);

export const aggregate =
	new IntrinsicComponentDefinition<CCIntrinsicComponentUnaryOperatorSpec>({
		type: ccIntrinsicComponentTypes.AGGREGATE,
		name: "Aggregate",
		in: {
			In: { name: "In", isBitWidthConfigurable: true, isSplittable: true },
		},
		out: { Out: { name: "Out" } },
		initialConfig: null,
		evaluate: (input) => {
			return [input.In.flat()];
		},
	});

export const decompose =
	new IntrinsicComponentDefinition<CCIntrinsicComponentUnaryOperatorSpec>({
		type: ccIntrinsicComponentTypes.DECOMPOSE,
		name: "Decompose",
		in: {
			In: { name: "In" },
		},
		out: {
			Out: { name: "Out", isBitWidthConfigurable: true, isSplittable: true },
		},
		initialConfig: null,
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

export const broadcast =
	new IntrinsicComponentDefinition<CCIntrinsicComponentUnaryOperatorSpec>({
		type: ccIntrinsicComponentTypes.BROADCAST,
		name: "Broadcast",
		in: {
			In: { name: "In" },
		},
		out: { Out: { name: "Out", isBitWidthConfigurable: true } },
		initialConfig: null,
		evaluate: (input, outputShape) => {
			invariant(input.In[0] && !input.In[1]);
			invariant(input.In[0][0] !== undefined && !input.In[0][1]);
			const inputValue = input.In[0][0];
			invariant(outputShape[0] && !outputShape[1]);
			const outputBitWidth = outputShape[0].bitWidth;
			return [Array.from({ length: outputBitWidth }, () => inputValue)];
		},
	});

export const flipflop =
	new IntrinsicComponentDefinition<CCIntrinsicComponentUnaryOperatorSpec>({
		type: ccIntrinsicComponentTypes.FLIPFLOP,
		name: "FlipFlop",
		in: {
			In: { name: "In" },
		},
		out: { Out: { name: "Out" } },
		initialConfig: null,
		evaluate: (_0, _1, previousInput) => previousInput.In,
	});

export const display =
	new IntrinsicComponentDefinition<CCIntrinsicComponentDisplaySpec>({
		type: ccIntrinsicComponentTypes.DISPLAY,
		name: "Display",
		in: { Pixels: { name: "Pixels" } },
		out: {},
		initialConfig: { resolution: { x: 100, y: 1000 } },
		evaluate: () => true,
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
};

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
