import type { ReactElement } from "react";
import { vector2 } from "../../../../common/vector2";
import { useComponentEditorStore } from "../store";

export default function CCComponentEditorGrid() {
	const componentEditorState = useComponentEditorStore()();
	const logScale = Math.log2(componentEditorState.perspective.scale);
	const canvasOriginPosition = componentEditorState.fromStageToCanvas(
		vector2.zero,
	);
	const canvasGridSize = 100 * 2 ** (Math.ceil(logScale) - logScale);

	const elements: ReactElement[] = [];
	let i = 0;
	for (
		let x = (canvasOriginPosition.x % canvasGridSize) - canvasGridSize;
		x <= componentEditorState.rendererSize.x;
		x += canvasGridSize
	) {
		elements.push(
			<div
				key={i}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "1px",
					height: "100%",
					backgroundColor: "rgba(0, 0, 0, 0.1)",
					transform: `translateX(${x}px)`,
				}}
			/>,
		);
		i += 1;
	}
	for (
		let y = (canvasOriginPosition.y % canvasGridSize) - canvasGridSize;
		y <= componentEditorState.rendererSize.y;
		y += canvasGridSize
	) {
		elements.push(
			<div
				key={i}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "1px",
					backgroundColor: "rgba(0, 0, 0, 0.1)",
					transform: `translateY(${y}px)`,
				}}
			/>,
		);
		i += 1;
	}

	return <div aria-hidden>{elements}</div>;
}
