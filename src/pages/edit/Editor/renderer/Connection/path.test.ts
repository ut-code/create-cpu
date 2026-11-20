import { describe, expect, it } from "vitest";
import { connectionPathData, pointsOnConnection } from "./path";

const from = { direction: "output" as const, position: { x: 0, y: 0 } };
const to = { direction: "input" as const, position: { x: 100, y: 50 } };

describe("connectionPathData", () => {
	it("runs straight out of the output, bends, and runs straight into the input", () => {
		expect(connectionPathData(from, to)).toBe(
			"M 0 0 L 10 0 C 40 0 60 50 90 50 L 100 50",
		);
	});
});

describe("pointsOnConnection", () => {
	it("follows the curve from where it bends out to where it bends in", () => {
		const points = pointsOnConnection(from, to, 4);

		expect(points[0]).toEqual({ x: 10, y: 0 });
		expect(points[2]).toEqual({ x: 50, y: 25 });
		expect(points[4]).toEqual({ x: 90, y: 50 });
	});
});
