import type { Messages } from "../../../../../i18n/messages";
import type { CCConnectionRejection } from "../../../../../store/nodePin";

export function describeConnectionRejection(
	rejection: CCConnectionRejection,
	messages: Messages,
): string {
	const texts = messages.editor.connectionRejection;
	switch (rejection.type) {
		case "sameDirection":
		case "sameNode":
		case "differentParentComponent":
		case "inputAlreadyConnected":
			return texts[rejection.type];
		case "bitWidthConflict": {
			const [a, b] = rejection.bitWidths;
			return rejection.bitWidths.some((bitWidths) => bitWidths.length > 1)
				? texts.bitWidthConflictAlready(a, b)
				: texts.bitWidthConflict(a, b);
		}
	}
}
