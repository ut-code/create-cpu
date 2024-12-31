export type Vector2 = { x: number; y: number };

export const vector2 = {
	zero: { x: 0, y: 0 },
	add: (a: Vector2, b: Vector2): Vector2 => ({
		x: a.x + b.x,
		y: a.y + b.y,
	}),
	sub: (a: Vector2, b: Vector2): Vector2 => ({
		x: a.x - b.x,
		y: a.y - b.y,
	}),
	mul: (a: Vector2, b: number): Vector2 => ({
		x: a.x * b,
		y: a.y * b,
	}),
	div: (a: Vector2, b: number): Vector2 => ({
		x: a.x / b,
		y: a.y / b,
	}),
	fromDomEvent: (e: { offsetX: number; offsetY: number }): Vector2 => ({
		x: e.offsetX,
		y: e.offsetY,
	}),
};
