import { type Vector2, vector2 } from "./vector2";

export type Rect = {
	position: Vector2;
	size: Vector2;
};
export const rect = {
	fromPoint: (point: Vector2): Rect => ({
		position: point,
		size: vector2.zero,
	}),
	bounds: (points: Vector2[]): Rect => {
		const [first, ...rest] = points;
		if (!first) throw new Error("No points provided");
		const rect = {
			position: first,
			size: vector2.zero,
		};
		for (const point of rest) {
			rect.position.x = Math.min(rect.position.x, point.x);
			rect.position.y = Math.min(rect.position.y, point.y);
			rect.size.x = Math.max(rect.size.x, point.x - rect.position.x);
			rect.size.y = Math.max(rect.size.y, point.y - rect.position.y);
		}
		return rect;
	},
	shift: (rect: Rect, offset: Vector2): Rect => ({
		position: vector2.add(rect.position, offset),
		size: rect.size,
	}),
};
