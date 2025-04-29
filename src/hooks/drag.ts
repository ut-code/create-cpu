import { type PointerEvent, useRef } from "react";
import { type Vector2, vector2 } from "../common/vector2";

const DRAG_THRESHOLD = 5;

export type UseDraggableProps = {
	onClick?(e: PointerEvent): void;
	onDragStart?(e: PointerEvent): void;
	onDrag?(e: PointerEvent): void;
	onDragEnd?(e: PointerEvent): void;
};

export function useDraggable(props: UseDraggableProps) {
	const { onClick, onDragStart, onDrag, onDragEnd } = props;

	const dragStateRef = useRef<{
		pointerId: number;
		initialPosition: Vector2;
		isDragging: boolean;
	} | null>(null);

	return {
		onPointerDown: (e: PointerEvent) => {
			if (!(e.buttons & 1)) return;
			dragStateRef.current = {
				pointerId: e.pointerId,
				initialPosition: vector2.fromDomEvent(e.nativeEvent),
				isDragging: false,
			};
			onDragStart?.(e);
			e.currentTarget.setPointerCapture(e.pointerId);
		},
		onPointerMove: (e: PointerEvent) => {
			if (!dragStateRef.current) return;
			if (dragStateRef.current.pointerId !== e.pointerId) return;
			if (dragStateRef.current.isDragging) {
				onDrag?.(e);
				return;
			}

			const currentPosition = vector2.fromDomEvent(e.nativeEvent);
			const distance = vector2.distance(
				dragStateRef.current.initialPosition,
				currentPosition,
			);
			if (distance > DRAG_THRESHOLD) {
				dragStateRef.current.isDragging = true;
				onDragStart?.(e);
				onDrag?.(e);
			}
		},
		onPointerUp: (e: PointerEvent) => {
			if (!dragStateRef.current) return;
			if (dragStateRef.current.pointerId !== e.pointerId) return;
			e.currentTarget.releasePointerCapture(e.pointerId);
		},
		onLostPointerCapture: (e: PointerEvent) => {
			if (!dragStateRef.current) return;
			if (dragStateRef.current.isDragging) onDragEnd?.(e);
			else onClick?.(e);
			dragStateRef.current = null;
		},
	};
}
