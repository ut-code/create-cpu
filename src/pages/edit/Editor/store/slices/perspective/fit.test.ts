import { describe, expect, it } from "vitest";
import type { Perspective } from "../../../../../../common/types";
import type { Vector2 } from "../../../../../../common/vector2";
import { fitPadding, isShownInRoom, perspectiveFitting } from "./fit";

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
			perspective.scale * (rendererSize.y - fitPadding.top - fitPadding.bottom),
		).toBeCloseTo(1000);
	});

	it("stays finite on a renderer smaller than the padding", () => {
		const perspective = perspectiveFitting(
			[{ position: { x: 0, y: 0 }, size: { x: 100, y: 100 } }],
			{ x: 50, y: 200 },
		);

		expect(Number.isFinite(perspective.scale)).toBe(true);
		expect(Number.isFinite(perspective.center.x)).toBe(true);
		expect(Number.isFinite(perspective.center.y)).toBe(true);
	});

	it("shows the middle when there are no nodes", () => {
		expect(perspectiveFitting([], rendererSize)).toEqual({
			center: { x: 0, y: 0 },
			scale: 1,
		});
	});
});

describe("isShownInRoom", () => {
	const perspective = { center: { x: 0, y: 0 }, scale: 1 };

	it("tells a rectangle inside the room from one reaching past its edge", () => {
		expect(
			isShownInRoom(
				{ position: { x: -50, y: -20 }, size: { x: 100, y: 40 } },
				perspective,
				rendererSize,
			),
		).toBe(true);
		expect(
			isShownInRoom(
				{ position: { x: 300, y: 0 }, size: { x: 200, y: 40 } },
				perspective,
				rendererSize,
			),
		).toBe(false);
	});

	it("counts the padding under the title bar as out of the room", () => {
		const underTitleBar = {
			position: { x: 0, y: -rendererSize.y / 2 + fitPadding.top - 10 },
			size: { x: 50, y: 30 },
		};
		expect(isShownInRoom(underTitleBar, perspective, rendererSize)).toBe(false);
	});

	it("shows every rectangle in the room once the perspective fits them", () => {
		const rects = [
			{ position: { x: -2000, y: 50 }, size: { x: 100, y: 30 } },
			{ position: { x: 400, y: 900 }, size: { x: 100, y: 30 } },
		];
		const fitted = perspectiveFitting(rects, rendererSize);
		for (const rect of rects) {
			expect(isShownInRoom(rect, fitted, rendererSize)).toBe(true);
		}
	});
});
