import type { CCConnectionRejection } from "../../../../../store/nodePin";

export function describeConnectionRejection(
	rejection: CCConnectionRejection,
): string {
	switch (rejection.type) {
		case "sameDirection":
			return "An input pin must be connected to an output pin";
		case "sameNode":
			return "Cannot connect pins of the same node";
		case "differentParentComponent":
			return "Cannot connect pins of different components";
		case "inputAlreadyConnected":
			return "This input pin is already connected";
		case "bitWidthConflict": {
			const [a, b] = rejection.bitWidths.map(
				(bitWidths) => `${bitWidths.join("/")} bit`,
			);
			const isInConflictAlready = rejection.bitWidths.some(
				(bitWidths) => bitWidths.length > 1,
			);
			return isInConflictAlready
				? `Cannot connect to a wire whose bit widths already disagree (${a} and ${b})`
				: `Bit widths do not match (${a} and ${b})`;
		}
	}
}
