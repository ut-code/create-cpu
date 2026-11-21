import type { Rect } from "../../../../../../common/rect";
import type { Perspective } from "../../../../../../common/types";
import type { Vector2 } from "../../../../../../common/vector2";

type Padding = { top: number; right: number; bottom: number; left: number };

/** Room kept clear of nodes: the title bar is at the top and the play button at the bottom right */
export const fitPadding: Padding = {
	top: 130,
	right: 30,
	bottom: 110,
	left: 30,
};

/** As `fitPadding`, with room at the bottom for the message about an error */
export const errorFitPadding: Padding = { ...fitPadding, bottom: 200 };

export function stageToCanvas(
	point: Vector2,
	perspective: Perspective,
	rendererSize: Vector2,
): Vector2 {
	return {
		x:
			(point.x - perspective.center.x) / perspective.scale + rendererSize.x / 2,
		y:
			(point.y - perspective.center.y) / perspective.scale + rendererSize.y / 2,
	};
}

/**
 * The perspective showing every rectangle inside a renderer of `rendererSize`, zoomed
 * out only as far as needed, never in
 */
export function perspectiveFitting(
	rects: readonly Rect[],
	rendererSize: Vector2,
	padding: Padding = fitPadding,
): Perspective {
	if (rects.length === 0) return { center: { x: 0, y: 0 }, scale: 1 };
	const left = Math.min(...rects.map((rect) => rect.position.x));
	const top = Math.min(...rects.map((rect) => rect.position.y));
	const right = Math.max(...rects.map((rect) => rect.position.x + rect.size.x));
	const bottom = Math.max(
		...rects.map((rect) => rect.position.y + rect.size.y),
	);
	// A renderer smaller than the padding still gets a finite scale
	const roomX = Math.max(1, rendererSize.x - padding.left - padding.right);
	const roomY = Math.max(1, rendererSize.y - padding.top - padding.bottom);
	const scale = Math.max(1, (right - left) / roomX, (bottom - top) / roomY);
	// The middle of the room is off the middle of the renderer by half the uneven padding
	return {
		center: {
			x: (left + right) / 2 - ((padding.left - padding.right) / 2) * scale,
			y: (top + bottom) / 2 - ((padding.top - padding.bottom) / 2) * scale,
		},
		scale,
	};
}

/** Whether `rect` lies wholly in the room `padding` leaves, as `perspective` shows it */
export function isShownInRoom(
	rect: Rect,
	perspective: Perspective,
	rendererSize: Vector2,
	padding: Padding = fitPadding,
): boolean {
	const topLeft = stageToCanvas(rect.position, perspective, rendererSize);
	const bottomRight = stageToCanvas(
		{ x: rect.position.x + rect.size.x, y: rect.position.y + rect.size.y },
		perspective,
		rendererSize,
	);
	return (
		topLeft.x >= padding.left &&
		topLeft.y >= padding.top &&
		bottomRight.x <= rendererSize.x - padding.right &&
		bottomRight.y <= rendererSize.y - padding.bottom
	);
}
