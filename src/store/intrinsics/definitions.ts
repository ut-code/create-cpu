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
	evaluate: (a: boolean) => boolean
) {
	return new IntrinsicComponentDefinition<CCIntrinsicComponentUnaryOperatorSpec>(
		{
			type,
			name,
			in: { In: { name: "In" } },
			out: { Out: { name: "Out" } },
			initialConfig: null,
			evaluate: (context, nodeId, shape) => {
				const inputShape = shape.inputShape.In;
				invariant(inputShape[0] && !inputShape[1]);
				const nodePinIdToValue = context.currentFrame.nodes.get(nodeId)?.pins;
				const inputValue = nodePinIdToValue?.get(inputShape[0].nodePinId);
				if (!inputValue || !nodePinIdToValue) {
					return false;
				}
				const outputValue = Array.from({ length: inputValue.length }, (_, i) =>
					evaluate(nullthrows(inputValue[i]))
				);
				const outputShape = shape.outputShape.Out;
				invariant(outputShape[0] && !outputShape[1]);

				nodePinIdToValue.set(outputShape[0].nodePinId, outputValue);
				return true;
			},
		}
	);
}

function createBinaryOperator(
	type: CCIntrinsicComponentType,
	name: string,
	evaluate: (a: boolean, b: boolean) => boolean
) {
	return new IntrinsicComponentDefinition<CCIntrinsicComponentBinaryOperatorSpec>(
		{
			type,
			name,
			in: { A: { name: "A" }, B: { name: "B" } },
			out: { Out: { name: "Out" } },
			initialConfig: null,
			evaluate: (context, nodeId, shape) => {
				const inputShapeA = shape.inputShape.A;
				const inputShapeB = shape.inputShape.B;
				invariant(inputShapeA[0] && !inputShapeA[1]);
				invariant(inputShapeB[0] && !inputShapeB[1]);
				const nodePinIdToValue = context.currentFrame.nodes.get(nodeId)?.pins;
				const inputValueA = nodePinIdToValue?.get(inputShapeA[0].nodePinId);
				const inputValueB = nodePinIdToValue?.get(inputShapeB[0].nodePinId);
				if (!inputValueA || !inputValueB || !nodePinIdToValue) {
					return false;
				}
				invariant(
					inputValueA.length === inputValueB.length,
					"Input lengths must match"
				);
				const outputValue = Array.from({ length: inputValueA.length }, (_, i) =>
					evaluate(nullthrows(inputValueA[i]), nullthrows(inputValueB[i]))
				);
				const outputShape = shape.outputShape.Out;
				invariant(outputShape[0] && !outputShape[1]);

				nodePinIdToValue.set(outputShape[0].nodePinId, outputValue);
				return true;
			},
		}
	);
}

export const and = createBinaryOperator(
	ccIntrinsicComponentTypes.AND,
	"And",
	(a, b) => a && b
);
export const or = createBinaryOperator(
	ccIntrinsicComponentTypes.OR,
	"Or",
	(a, b) => a || b
);
export const not = createUnaryOperator(
	ccIntrinsicComponentTypes.NOT,
	"Not",
	(a) => !a
);
export const xor = createBinaryOperator(
	ccIntrinsicComponentTypes.XOR,
	"Xor",
	(a, b) => a !== b
);
export const input = createUnaryOperator(
	ccIntrinsicComponentTypes.INPUT,
	"Input",
	(a) => a
);
export const output = createUnaryOperator(
	ccIntrinsicComponentTypes.OUTPUT,
	"Output",
	(a) => a
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
		evaluate: (context, nodeId, shape) => {
			const inputShape = shape.inputShape.In;
			const nodePinIdToValue = context.currentFrame.nodes.get(nodeId)?.pins;
			const inputValues = inputShape.map((s) =>
				nodePinIdToValue?.get(s.nodePinId)
			);
			if (inputValues.some((v) => !v) || !nodePinIdToValue) {
				return false;
			}
			const outputValue = inputValues.flatMap((v) => nullthrows(v));
			nodePinIdToValue.set(
				nullthrows(shape.outputShape.Out[0]?.nodePinId),
				outputValue
			);
			return true;
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
		evaluate: (context, nodeId, shape) => {
			const inputShape = shape.inputShape.In;
			invariant(inputShape[0] && !inputShape[1]);
			const nodePinIdToValue = context.currentFrame.nodes.get(nodeId)?.pins;
			const outputShape = shape.outputShape.Out;
			const inputValue = nodePinIdToValue?.get(inputShape[0].nodePinId);
			if (!inputValue || !nodePinIdToValue) {
				return false;
			}
			let currentIndex = 0;
			for (const shape of outputShape) {
				nodePinIdToValue.set(
					shape.nodePinId,
					inputValue.slice(currentIndex, currentIndex + shape.bitWidth)
				);
				currentIndex += shape.bitWidth;
			}
			return true;
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
		evaluate: (context, nodeId, shape) => {
			const inputShape = shape.inputShape.In;
			invariant(inputShape[0] && !inputShape[1]);
			const nodePinIdToValue = context.currentFrame.nodes.get(nodeId)?.pins;
			const outputShape = shape.outputShape.Out;
			invariant(outputShape[0] && !outputShape[1]);
			const inputValue = nodePinIdToValue?.get(inputShape[0].nodePinId);
			if (!inputValue || !nodePinIdToValue) {
				return false;
			}
			invariant(inputValue[0] && !inputValue[1]);
			nodePinIdToValue.set(
				outputShape[0].nodePinId,
				Array.from({ length: outputShape[0].bitWidth }, () =>
					nullthrows(inputValue[0])
				)
			);
			return true;
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
		evaluate: (context, nodeId, shape) => {
			const inputShape = shape.inputShape.In;
			invariant(inputShape[0] && !inputShape[1]);
			const outputShape = shape.outputShape.Out;
			invariant(outputShape[0] && !outputShape[1]);
			const nodePinIdToValue = context.currentFrame.nodes.get(nodeId)?.pins;
			const previousValue =
				context.previousFrame?.nodes
					.get(nodeId)
					?.pins.get(inputShape[0].nodePinId) ?? [];
			if (!nodePinIdToValue) {
				return false;
			}
			nodePinIdToValue.set(outputShape[0].nodePinId, previousValue);
			return true;
		},
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
		definition.allPins.map((pin) => [pin.id, definition])
	)
);
