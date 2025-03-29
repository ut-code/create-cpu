import { type PointerEvent, useRef } from "react";
import type { Vector2 } from "../../../../common/vector2";
import { useComponentEditorStore } from "../store";

export type UseDraggableProps = {
	onClick?(e: PointerEvent): void;
	onDragStart(e: PointerEvent): Vector2;
	onDrag(e: PointerEvent): void;
};

export function useDraggable(props: UseDraggableProps) {
	const { onClick, onDragStart, onDrag } = props;

	const perspective = useComponentEditorStore()((state) => state.perspective);
	const dragStateRef = useRef<{
		pointerId: number;
		initialPosition: Vector2;
	} | null>(null);

	return {
		onPointerDown: (e: PointerEvent) => {
			if (!(e.buttons & 1)) return;
			dragStateRef.current = {
				pointerId: e.pointerId,
				initialPosition: { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY },
			};
			onDragStart(e);
			e.currentTarget.setPointerCapture(e.pointerId);
		},
		onPointerMove: (e: PointerEvent) => {
			if (!dragStateRef.current) return;
		},
		onPointerUp: (e: PointerEvent) => {
			e.currentTarget.releasePointerCapture(e.pointerId);
		},
	};
}
