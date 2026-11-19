import { describe, expect, it } from "vitest";
import type { Perspective } from "../../../../../../common/types";
import type { Vector2 } from "../../../../../../common/vector2";
import { fitPadding, perspectiveFitting } from "./fit";

const rendererSize = { x: 900, y: 800 };

function toCanvas(point: Vector2, { center, scale }: Perspective): Vector2 {
	return {
		x: (point.x - center.x) / scale + rendererSize.x / 2,
		y: (point.y - center.y) / scale + rendererSize.y / 2,
	};
}

function expectInsideRoom(
	rects: { position: Vector2; size: Vector2 }[],
	perspective: Perspective,
) {
	for (const { position, size } of rects) {
		const topLeft = toCanvas(position, perspective);
		const bottomRight = toCanvas(
			{ x: position.x + size.x, y: position.y + size.y },
			perspective,
		);
		expect(topLeft.x).toBeGreaterThanOrEqual(fitPadding.left - 1e-9);
		expect(topLeft.y).toBeGreaterThanOrEqual(fitPadding.top - 1e-9);
		expect(bottomRight.x).toBeLessThanOrEqual(
			rendererSize.x - fitPadding.right + 1e-9,
		);
		expect(bottomRight.y).toBeLessThanOrEqual(
			rendererSize.y - fitPadding.bottom + 1e-9,
		);
	}
}

describe("perspectiveFitting", () => {
	it("keeps the size of nodes that fit, and moves them clear of the edges", () => {
		const rects = [
			{ position: { x: -350, y: -115 }, size: { x: 100, y: 30 } },
			{ position: { x: 250, y: -15 }, size: { x: 100, y: 30 } },
		];
		const perspective = perspectiveFitting(rects, rendererSize);

		expect(perspective.scale).toBe(1);
		expectInsideRoom(rects, perspective);
	});

	it("zooms out just enough for nodes that do not fit", () => {
		const rects = [
			{ position: { x: -500, y: -400 }, size: { x: 100, y: 100 } },
			{ position: { x: 600, y: 500 }, size: { x: 100, y: 100 } },
		];
		const perspective = perspectiveFitting(rects, rendererSize);

		expect(perspective.scale).toBeGreaterThan(1);
		expectInsideRoom(rects, perspective);
		expect(
			perspectiveFitting(rects, rendererSize).scale *
				(rendererSize.y - fitPadding.top - fitPadding.bottom),
		).toBeCloseTo(1000);
	});

	it("shows the middle when there are no nodes", () => {
		expect(perspectiveFitting([], rendererSize)).toEqual({
			center: { x: 0, y: 0 },
			scale: 1,
		});
	});
});
