import type { Vector2 } from "../../../../../common/vector2";
import type { CCComponentPinType } from "../../../../../store/componentPin";

export type CCComponentEditorRendererConnectionEndpoint = {
	direction: CCComponentPinType;
	position: Vector2;
};

/** How far a wire runs straight out of a pin before it bends */
export const connectionStraightGap = 10;
const polarity: Record<CCComponentPinType, number> = {
	input: -1,
	output: 1,
};

/** A wire leaves `from` straight, bends along a cubic curve and enters `to` straight */
export function connectionCurve(
	from: CCComponentEditorRendererConnectionEndpoint,
	to: CCComponentEditorRendererConnectionEndpoint,
): [Vector2, Vector2, Vector2, Vector2] {
	const fromSide = connectionStraightGap * polarity[from.direction];
	const toSide = connectionStraightGap * polarity[to.direction];
	return [
		{ x: from.position.x + fromSide, y: from.position.y },
		{ x: from.position.x + 4 * fromSide, y: from.position.y },
		{ x: to.position.x + 4 * toSide, y: to.position.y },
		{ x: to.position.x + toSide, y: to.position.y },
	];
}

export function connectionPathData(
	from: CCComponentEditorRendererConnectionEndpoint,
	to: CCComponentEditorRendererConnectionEndpoint,
): string {
	const [start, control1, control2, end] = connectionCurve(from, to);
	return [
		`M ${from.position.x} ${from.position.y}`,
		`L ${start.x} ${start.y}`,
		`C ${control1.x} ${control1.y} ${control2.x} ${control2.y} ${end.x} ${end.y}`,
		`L ${to.position.x} ${to.position.y}`,
	].join(" ");
}

/** Points along the curve of a wire, from `from` to `to` */
export function pointsOnConnection(
	from: CCComponentEditorRendererConnectionEndpoint,
	to: CCComponentEditorRendererConnectionEndpoint,
	count: number,
): Vector2[] {
	const [p0, p1, p2, p3] = connectionCurve(from, to);
	return Array.from({ length: count + 1 }, (_, index) => {
		const t = index / count;
		const u = 1 - t;
		const at = (key: "x" | "y") =>
			u ** 3 * p0[key] +
			3 * u ** 2 * t * p1[key] +
			3 * u * t ** 2 * p2[key] +
			t ** 3 * p3[key];
		return { x: at("x"), y: at("y") };
	});
}
