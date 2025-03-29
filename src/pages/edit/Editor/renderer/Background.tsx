import { vector2 } from "../../../../common/vector2";
import { useComponentEditorStore } from "../store";

export default function CCComponentEditorRendererBackground() {
	const componentEditorState = useComponentEditorStore()();
	const viewBox = componentEditorState.getViewBox();

	return (
		<rect
			{...viewBox}
			onClick={() => {
				componentEditorState.selectNode([], true);
			}}
			onPointerDown={(pointerDownEvent) => {
				const { currentTarget } = pointerDownEvent;
				const startPerspective = componentEditorState.perspective;
				const startPoint = vector2.fromDomEvent(pointerDownEvent.nativeEvent);

				pointerDownEvent.currentTarget.setPointerCapture(
					pointerDownEvent.pointerId,
				);
				const onPointerMove = (pointerMoveEvent: PointerEvent) => {
					const endPoint = vector2.fromDomEvent(pointerMoveEvent);
					componentEditorState.setPerspective({
						...startPerspective,
						center: vector2.sub(
							startPerspective.center,
							vector2.mul(
								vector2.sub(endPoint, startPoint),
								startPerspective.scale,
							),
						),
					});
				};
				const onPointerUp = () => {
					currentTarget.removeEventListener("pointermove", onPointerMove);
					currentTarget.removeEventListener("pointerup", onPointerUp);
					pointerDownEvent.currentTarget.releasePointerCapture(
						pointerDownEvent.pointerId,
					);
				};
				currentTarget.addEventListener("pointermove", onPointerMove);
				currentTarget.addEventListener("pointerup", onPointerUp);
			}}
			onWheel={(wheelEvent) => {
				const scaleDelta = Math.exp(wheelEvent.deltaY / 256);
				const scaleCenter = componentEditorState.fromCanvasToStage(
					vector2.fromDomEvent(wheelEvent.nativeEvent),
				);
				componentEditorState.setPerspective({
					scale: componentEditorState.perspective.scale * scaleDelta,
					center: vector2.add(
						scaleCenter,
						vector2.mul(
							vector2.sub(componentEditorState.perspective.center, scaleCenter),
							scaleDelta,
						),
					),
				});
			}}
			fill="transparent"
		/>
	);
}
