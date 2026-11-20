import { type MarkedTextSegment, parseMarkedText } from "./markedText";

/** What a text marks other than names, which a language may translate */
export function marksOf(text: string) {
	return parseMarkedText(text)
		.flatMap((segment: MarkedTextSegment) => {
			if (segment.type === "value") {
				return [segment.value.map((bit) => (bit ? 1 : 0)).join("")];
			}
			if (segment.type === "control") return [`<${segment.control}>`];
			return [];
		})
		.toSorted();
}
