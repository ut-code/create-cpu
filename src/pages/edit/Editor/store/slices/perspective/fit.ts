import type { Rect } from "../../../../../../common/rect";
import type { Perspective } from "../../../../../../common/types";
import type { Vector2 } from "../../../../../../common/vector2";

/** Room kept clear of nodes: the title bar is at the top and the play button at the bottom right */
export const fitPadding = { top: 130, right: 30, bottom: 110, left: 30 };

/**
 * The perspective showing every rectangle inside a renderer of `rendererSize`, zoomed
 * out only as far as needed, never in
 */
export function perspectiveFitting(
	rects: readonly Rect[],
	rendererSize: Vector2,
): Perspective {
	if (rects.length === 0) return { center: { x: 0, y: 0 }, scale: 1 };
	const left = Math.min(...rects.map((rect) => rect.position.x));
	const top = Math.min(...rects.map((rect) => rect.position.y));
	const right = Math.max(...rects.map((rect) => rect.position.x + rect.size.x));
	const bottom = Math.max(
		...rects.map((rect) => rect.position.y + rect.size.y),
	);
	// A renderer smaller than the padding still gets a finite scale
	const roomX = Math.max(
		1,
		rendererSize.x - fitPadding.left - fitPadding.right,
	);
	const roomY = Math.max(
		1,
		rendererSize.y - fitPadding.top - fitPadding.bottom,
	);
	const scale = Math.max(1, (right - left) / roomX, (bottom - top) / roomY);
	// The middle of the room is off the middle of the renderer by half the uneven padding
	return {
		center: {
			x:
				(left + right) / 2 - ((fitPadding.left - fitPadding.right) / 2) * scale,
			y:
				(top + bottom) / 2 - ((fitPadding.top - fitPadding.bottom) / 2) * scale,
		},
		scale,
	};
}

/** Whether `rect` lies wholly in the room the padding leaves, as `perspective` shows it */
export function isShownInRoom(
	rect: Rect,
	perspective: Perspective,
	rendererSize: Vector2,
): boolean {
	const toCanvas = (point: Vector2) => ({
		x:
			(point.x - perspective.center.x) / perspective.scale + rendererSize.x / 2,
		y:
			(point.y - perspective.center.y) / perspective.scale + rendererSize.y / 2,
	});
	const topLeft = toCanvas(rect.position);
	const bottomRight = toCanvas({
		x: rect.position.x + rect.size.x,
		y: rect.position.y + rect.size.y,
	});
	return (
		topLeft.x >= fitPadding.left &&
		topLeft.y >= fitPadding.top &&
		bottomRight.x <= rendererSize.x - fitPadding.right &&
		bottomRight.y <= rendererSize.y - fitPadding.bottom
	);
}
